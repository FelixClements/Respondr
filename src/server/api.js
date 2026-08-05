const { Hono } = require('hono');
const settingsDb = require('../db/settings');
const pushSubscriptionsDb = require('../db/pushSubscriptions');
const { getStatus, getHealth, restartClient } = require('../whatsapp/client');
const scheduler = require('../scheduler');
const { runOnce } = require('../engine/runner');
const { sendTest } = require('../notifications');
const webPush = require('../notifications/web-push');
const logger = require('../lib/logger');

const MANUAL_RUN_COOLDOWN_MS = 60 * 1000;

function buildApiApp() {
  const app = new Hono();
  let lastManualRun = 0;

  app.get('/status', async (c) => {
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

  app.post('/run', async (c) => {
    const now = Date.now();
    if (now - lastManualRun < MANUAL_RUN_COOLDOWN_MS) {
      return c.text('Please wait before triggering another run', 429);
    }
    lastManualRun = now;
    const result = await runOnce();
    return c.json(result);
  });

  app.post('/reconnect', async (c) => {
    logger.info('Reconnect requested from dashboard');
    try {
      await restartClient();
      return c.json({ ok: true, status: getStatus() });
    } catch (err) {
      logger.error(`Reconnect failed: ${err}`);
      return c.json({ ok: false, error: err.message, status: getStatus() }, 500);
    }
  });

  app.post('/push/subscribe', async (c) => {
    const body = await c.req.json().catch(() => ({}));
    if (!body.endpoint || !body.keys || !body.keys.p256dh || !body.keys.auth) {
      return c.json({ ok: false, error: 'Invalid subscription' }, 400);
    }
    pushSubscriptionsDb.addPushSubscription(body);
    return c.json({ ok: true });
  });

  app.post('/push/unsubscribe', async (c) => {
    const body = await c.req.json().catch(() => ({}));
    if (!body.endpoint) {
      return c.json({ ok: false, error: 'Invalid subscription' }, 400);
    }
    pushSubscriptionsDb.removePushSubscription(body.endpoint);
    return c.json({ ok: true });
  });

  app.post('/push/test', async (c) => {
    const result = await webPush.sendToAll({
      title: 'Respondr test',
      body: 'Push notifications are working',
      url: '/',
      icon: '/icon-192.png'
    });
    return c.json({ ok: true, result });
  });

  app.get('/logs', async (c) => {
    const level = c.req.query('level') || settingsDb.get('log_level');
    const limit = parseInt(c.req.query('limit'), 10) || 500;
    return c.json({
      level: logger.getLevel(),
      logs: logger.getLogs({ level, limit: Number.isFinite(limit) ? limit : 500 })
    });
  });

  return app;
}

module.exports = { buildApiApp };
