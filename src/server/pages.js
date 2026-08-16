const { Hono } = require('hono');
const { getCookie } = require('hono/cookie');
const auth = require('./auth');
const { render } = require('./render');
const settingsDb = require('../db/settings');
const chatStateDb = require('../db/chatState');
const historyDb = require('../db/history');
const scheduler = require('../scheduler');
const { getStatus, getQrDataUrl, getRecentChats } = require('../whatsapp/client');
const chatAnalysis = require('../domain/chatAnalysis');
const logger = require('../lib/logger');

function buildPageApp() {
  const app = new Hono();

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
      const isMobile = /Mobile|Android|iPhone|iPad|iPod/i.test(c.req.header('user-agent') || '');
      const token = auth.createSession(username, isMobile);
      auth.setSessionCookie(c, token, isMobile);
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
      const isMobile = /Mobile|Android|iPhone|iPad|iPod/i.test(c.req.header('user-agent') || '');
      const token = auth.createSession(username, isMobile);
      auth.setSessionCookie(c, token, isMobile);
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
    const recentScans = historyDb.getRecentScans(1);
    const settings = settingsDb.getAll();
    const thresholdHours = parseFloat(settings.threshold_hours) || 3;
    const limit = parseInt(settings.chat_limit, 10) || 50;

    const stateCounts = { ignored: 0, done: 0 };
    for (const row of chatStateDb.list()) {
      if (stateCounts[row.state] !== undefined) stateCounts[row.state]++;
    }

    const now = Date.now();
    const stats = {
      total: null,
      urgent: null,
      snoozed: stateCounts.ignored + stateCounts.done
    };

    try {
      const raw = await getRecentChats(limit);
      const analysis = chatAnalysis.statsForChats(raw, thresholdHours, now);
      stats.total = analysis.total;
      stats.urgent = analysis.urgent;
    } catch (err) {
      // stats remain null for live chat data
    }

    const lastScan = recentScans[0] || null;
    const nextScan = scheduler.getNextRunAt();
    return page(c, 'index', { title: 'Dashboard', status, recentReminders, stats, lastScan, nextScan });
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
    const status = getStatus();

    try {
      const raw = await getRecentChats(limit);
      const stateRows = chatStateDb.list();
      const stateById = {};
      for (const row of stateRows) {
        stateById[row.id] = { state: row.state, until: row.until, createdAt: row.created_at };
      }
      const now = Date.now();
      chats = raw.map((chat) => {
        const state = stateById[chat.id] || null;
        return chatAnalysis.enrichChat(chat, state, thresholdHours, now);
      });
    } catch (err) {
      error = err.message;
    }

    const nextScan = scheduler.getNextRunAt();
    return page(c, 'chats', { title: 'Chats', chats, error, status, nextScan });
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

  return app;
}

module.exports = { buildPageApp };
