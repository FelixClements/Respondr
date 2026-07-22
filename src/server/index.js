const { Hono } = require('hono');
const { basicAuth } = require('hono/basic-auth');
const { HTTPException } = require('hono/http-exception');
const { serveStatic } = require('@hono/node-server/serve-static');
const { render } = require('./render');
const { getStatus, getQrDataUrl } = require('../whatsapp/client');
const settingsDb = require('../db/settings');
const ignoredDb = require('../db/ignored');
const historyDb = require('../db/history');
const scheduler = require('../scheduler');
const { runOnce } = require('../engine/runner');
const logger = require('../lib/logger');

const MANUAL_RUN_COOLDOWN_MS = 60 * 1000;

function createApp() {
  const app = new Hono();
  let lastManualRun = 0;

  if (process.env.DASHBOARD_USER && process.env.DASHBOARD_PASSWORD) {
    app.use('*', basicAuth({
      username: process.env.DASHBOARD_USER,
      password: process.env.DASHBOARD_PASSWORD
    }));
  }

  app.use('/static/*', serveStatic({
    root: './public',
    rewriteRequestPath: (path) => path.replace(/^\/static\//, '')
  }));

  app.use('*', async (c, next) => {
    logger.info(`${c.req.method} ${c.req.path}`);
    await next();
  });

  app.get('/', async (c) => {
    const status = getStatus();
    const recentReminders = historyDb.getRecentReminders(5);
    return c.html(await render('index', { title: 'Dashboard', status, recentReminders }));
  });

  app.get('/qr', async (c) => {
    const status = getStatus();
    const qr = getQrDataUrl();
    return c.html(await render('qr', { title: 'Link WhatsApp', status, qr }));
  });

  app.get('/settings', async (c) => {
    const settings = settingsDb.getAll();
    return c.html(await render('settings', { title: 'Settings', settings }));
  });

  app.post('/settings', async (c) => {
    const body = await c.req.parseBody();
    const interval = parseInt(body.interval_minutes, 10);
    const limit = parseInt(body.chat_limit, 10);
    const threshold = parseInt(body.threshold_hours, 10);

    if (!Number.isFinite(interval) || interval < 1) {
      return c.text('Scan interval must be at least 1 minute', 400);
    }
    if (!Number.isFinite(limit) || limit < 1) {
      return c.text('Chat limit must be at least 1', 400);
    }
    if (!Number.isFinite(threshold) || threshold < 1) {
      return c.text('Threshold must be at least 1 hour', 400);
    }

    settingsDb.set('interval_minutes', interval);
    settingsDb.set('chat_limit', limit);
    settingsDb.set('threshold_hours', threshold);
    try {
      scheduler.reschedule();
    } catch (err) {
      logger.error(`Failed to reschedule: ${err}`);
    }
    return c.redirect('/settings');
  });

  app.get('/ignored', async (c) => {
    const ignored = ignoredDb.list();
    return c.html(await render('ignored', { title: 'Ignored Chats', ignored }));
  });

  app.post('/ignored/:id', async (c) => {
    const id = c.req.param('id');
    const body = await c.req.parseBody();
    ignoredDb.add(id, body.name || id);
    return c.redirect('/ignored');
  });

  app.post('/ignored/:id/delete', async (c) => {
    const id = c.req.param('id');
    ignoredDb.remove(id);
    return c.redirect('/ignored');
  });

  app.get('/history', async (c) => {
    const reminders = historyDb.getRecentReminders(50);
    const scans = historyDb.getRecentScans(50);
    return c.html(await render('history', { title: 'History', reminders, scans }));
  });

  app.get('/api/status', async (c) => {
    const status = getStatus();
    const settings = settingsDb.getAll();
    return c.json({
      status: status.status,
      isReady: status.isReady,
      nextScan: scheduler.getNextRunAt(),
      settings
    });
  });

  app.post('/api/run', async (c) => {
    const now = Date.now();
    if (now - lastManualRun < MANUAL_RUN_COOLDOWN_MS) {
      return c.text('Please wait before triggering another run', 429);
    }
    lastManualRun = now;
    const result = await runOnce();
    return c.json(result);
  });

  app.onError((err, c) => {
    if (err instanceof HTTPException) {
      return err.getResponse();
    }
    logger.error(err.stack || err.message || err);
    return c.text('Internal Server Error', 500);
  });

  return app;
}

module.exports = { createApp };
