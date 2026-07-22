const { Hono } = require('hono');
const { basicAuth } = require('hono/basic-auth');
const { HTTPException } = require('hono/http-exception');
const { serveStatic } = require('@hono/node-server/serve-static');
const { render } = require('./render');
const { getStatus, getQrDataUrl } = require('../whatsapp/client');
const settingsDb = require('../db/settings');
const ignoredDb = require('../db/ignored');
const historyDb = require('../db/history');

function createApp() {
  const app = new Hono();

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
    console.log(`${c.req.method} ${c.req.path}`);
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
    settingsDb.set('interval_minutes', body.interval_minutes);
    settingsDb.set('chat_limit', body.chat_limit);
    settingsDb.set('threshold_hours', body.threshold_hours);
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

  app.onError((err, c) => {
    if (err instanceof HTTPException) {
      return err.getResponse();
    }
    console.error(err);
    return c.text('Internal Server Error', 500);
  });

  return app;
}

module.exports = { createApp };
