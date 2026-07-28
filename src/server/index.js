const { Hono } = require('hono');
const { HTTPException } = require('hono/http-exception');
const { serveStatic } = require('@hono/node-server/serve-static');
const { render } = require('./render');
const { getStatus, getHealth, getQrDataUrl, getRecentChats, restartClient } = require('../whatsapp/client');
const settingsDb = require('../db/settings');
const chatStateDb = require('../db/chatState');
const historyDb = require('../db/history');
const scheduler = require('../scheduler');
const { runOnce } = require('../engine/runner');
const logger = require('../lib/logger');
const auth = require('./auth');
const { sendTest } = require('../notifications');
const { getCookie } = require('hono/cookie');

const MANUAL_RUN_COOLDOWN_MS = 60 * 1000;

function createApp() {
  const app = new Hono();
  let lastManualRun = 0;

  auth.ensureAccountFromEnv();

  app.use('/static/*', serveStatic({
    root: './public',
    rewriteRequestPath: (path) => path.replace(/^\/static\//, '')
  }));

  app.use('*', auth.authMiddleware);

  app.use('*', async (c, next) => {
    logger.info(`${c.req.method} ${c.req.path}`);
    await next();
  });

  async function page(c, template, data = {}) {
    return c.html(await render(template, { ...data, user: c.get('user') || null }));
  }

  app.get('/setup', async (c) => {
    if (auth.isConfigured()) return c.redirect('/');
    return page(c, 'setup', { title: 'Create account', error: null });
  });

  app.post('/setup', async (c) => {
    if (auth.isConfigured()) return c.redirect('/');
    const body = await c.req.parseBody();
    const { username, password } = body;
    try {
      auth.configureAccount(username, password);
      const token = auth.createSession(username);
      auth.setSessionCookie(c, token);
      return c.redirect('/');
    } catch (err) {
      return page(c, 'setup', { title: 'Create account', error: err.message });
    }
  });

  app.get('/login', async (c) => {
    if (!auth.isConfigured()) return c.redirect('/setup');
    if (auth.getUserFromCookie(c)) return c.redirect('/');
    return page(c, 'login', { title: 'Login', error: null });
  });

  app.post('/login', async (c) => {
    const body = await c.req.parseBody();
    const { username, password } = body;
    if (auth.validateCredentials(username, password)) {
      const token = auth.createSession(username);
      auth.setSessionCookie(c, token);
      return c.redirect('/');
    }
    return page(c, 'login', { title: 'Login', error: 'Invalid username or password' });
  });

  app.post('/logout', async (c) => {
    const token = getCookie(c, 'session');
    if (token) auth.destroySession(token);
    auth.clearSessionCookie(c);
    return c.redirect('/login');
  });

  app.get('/', async (c) => {
    const status = getStatus();
    const recentReminders = historyDb.getRecentReminders(5);
    return page(c, 'index', { title: 'Dashboard', status, recentReminders });
  });

  app.get('/qr', async (c) => {
    const status = getStatus();
    const qr = getQrDataUrl();
    return page(c, 'qr', { title: 'Link WhatsApp', status, qr });
  });

  app.get('/settings', async (c) => {
    const settings = settingsDb.getAll();
    return page(c, 'settings', { title: 'Settings', settings });
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

  app.get('/notifications', async (c) => {
    const settings = settingsDb.getAll();
    return page(c, 'notifications', { title: 'Notifications', settings });
  });

  app.post('/notifications', async (c) => {
    const body = await c.req.parseBody();

    function boolValue(name) {
      return body[name] === '1' ? '1' : '0';
    }

    function intValue(name, fallback) {
      const value = parseInt(body[name], 10);
      return Number.isFinite(value) ? value : fallback;
    }

    settingsDb.set('ntfy_enabled', boolValue('ntfy_enabled'));
    settingsDb.set('ntfy_server', String(body.ntfy_server || 'https://ntfy.sh').trim());
    settingsDb.set('ntfy_topic', String(body.ntfy_topic || '').trim());
    settingsDb.set('ntfy_priority', String(intValue('ntfy_priority', 3)));

    settingsDb.set('gotify_enabled', boolValue('gotify_enabled'));
    settingsDb.set('gotify_url', String(body.gotify_url || '').trim());
    settingsDb.set('gotify_token', String(body.gotify_token || '').trim());
    settingsDb.set('gotify_priority', String(intValue('gotify_priority', 5)));

    return c.redirect('/notifications');
  });

  app.post('/api/test-notification', async (c) => {
    const results = await sendTest('Respondr test', 'This is a test notification from Respondr.');
    return c.json({ results });
  });

  app.get('/logs', async (c) => {
    const settings = settingsDb.getAll();
    const logs = logger.getLogs({ limit: 200 });
    return page(c, 'logs', { title: 'Logs', logs, settings });
  });

  app.post('/logs', async (c) => {
    const body = await c.req.parseBody();
    const level = String(body.log_level || 'info').toLowerCase();
    settingsDb.set('log_level', level);
    logger.setLevel(level);
    logger.info(`Log level changed to ${level}`);
    return c.redirect('/logs');
  });

  app.get('/api/logs', async (c) => {
    const level = c.req.query('level') || settingsDb.get('log_level');
    const limit = parseInt(c.req.query('limit'), 10) || 500;
    return c.json({
      level: logger.getLevel(),
      logs: logger.getLogs({ level, limit: Number.isFinite(limit) ? limit : 500 })
    });
  });

  app.get('/ignored', async (c) => {
    const ignored = chatStateDb.listByState('ignored');
    return page(c, 'ignored', { title: 'Ignored Chats', ignored });
  });

  app.post('/ignored/:id', async (c) => {
    const id = c.req.param('id');
    const body = await c.req.parseBody();
    chatStateDb.add(id, body.name || id, 'ignored');
    return c.redirect('/ignored');
  });

  app.post('/ignored/:id/delete', async (c) => {
    const id = c.req.param('id');
    chatStateDb.remove(id);
    return c.redirect('/ignored');
  });

  app.get('/chats', async (c) => {
    const settings = settingsDb.getAll();
    const thresholdHours = parseFloat(settings.threshold_hours) || 3;
    const limit = parseInt(settings.chat_limit, 10) || 50;
    let chats = [];
    let error = null;

    try {
      const raw = await getRecentChats(limit);
      const stateById = chatStateDb.getStateById();
      const now = Date.now();
      chats = raw.map((chat) => {
        const lastTs = chat.lastMessage?.timestampMs || 0;
        const hoursSince = lastTs ? (now - lastTs) / (1000 * 60 * 60) : null;
        return {
          ...chat,
          hoursSince: hoursSince !== null ? Number(hoursSince.toFixed(1)) : null,
          needsReply: Boolean(
            chat.lastMessage &&
            !chat.lastMessage.fromMe &&
            !chat.lastMessage.hasReactionFromMe &&
            hoursSince !== null &&
            hoursSince > thresholdHours
          ),
          state: stateById[chat.id] || null
        };
      });
    } catch (err) {
      error = err.message;
    }

    return page(c, 'chats', { title: 'Chats', chats, error });
  });

  app.post('/chats/:id/ignore', async (c) => {
    const id = c.req.param('id');
    const body = await c.req.parseBody();
    chatStateDb.add(id, body.name || id, 'ignored');
    return c.redirect('/chats');
  });

  app.post('/chats/:id/unignore', async (c) => {
    const id = c.req.param('id');
    chatStateDb.remove(id);
    return c.redirect('/chats');
  });

  app.post('/chats/:id/done', async (c) => {
    const id = c.req.param('id');
    const body = await c.req.parseBody();
    chatStateDb.add(id, body.name || id, 'done');
    return c.redirect('/chats');
  });

  app.post('/chats/:id/undone', async (c) => {
    const id = c.req.param('id');
    chatStateDb.remove(id);
    return c.redirect('/chats');
  });

  app.get('/history', async (c) => {
    const reminders = historyDb.getRecentReminders(50);
    const scans = historyDb.getRecentScans(50);
    return page(c, 'history', { title: 'History', reminders, scans });
  });

  app.get('/api/status', async (c) => {
    const status = getStatus();
    let health = null;
    try {
      health = getHealth();
    } catch (err) {
      logger.error(`Health check failed: ${err}`);
      health = {
        whatsapp: { ok: false, detail: status.status },
        puppeteer: { ok: false, detail: err.message },
        chrome: { ok: false, detail: 'health check failed' }
      };
    }
    const settings = settingsDb.getAll();
    return c.json({
      status: status.status,
      isReady: status.isReady,
      health,
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

  app.post('/api/reconnect', async (c) => {
    logger.info('Reconnect requested from dashboard');
    try {
      await restartClient();
      return c.json({ ok: true, status: getStatus() });
    } catch (err) {
      logger.error(`Reconnect failed: ${err}`);
      return c.json({ ok: false, error: err.message, status: getStatus() }, 500);
    }
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
