import { Hono } from 'hono';
import * as settingsDb from '../db/settings.js';
import * as pushSubscriptionsDb from '../db/pushSubscriptions.js';
import * as chatStateDb from '../db/chatState.js';
import * as historyDb from '../db/history.js';
import { getStatus, getHealth, restartClient, getQrDataUrl, getRecentChats } from '../whatsapp/client.js';
import * as scheduler from '../scheduler.js';
import { runOnce } from '../engine/runner.js';
import { sendTest } from '../notifications/index.js';
import * as webPush from '../notifications/web-push.js';
import * as chatAnalysis from '../domain/chatAnalysis.js';
import * as logger from '../lib/logger.js';
import type { AppVariables } from './middleware.js';

const MANUAL_RUN_COOLDOWN_MS = 60 * 1000;

export function buildApiApp() {
  const app = new Hono<{ Variables: AppVariables }>();
  let lastManualRun = 0;

  app.get('/status', async (c) => {
    const status = getStatus();
    let health = null;
    try {
      health = getHealth();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error(`Health check failed: ${message}`);
      health = {
        whatsapp: { ok: false, detail: status.status },
        puppeteer: { ok: false, detail: message },
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

  app.get('/dashboard', async (c) => {
    const status = getStatus();
    const recentReminders = historyDb.getRecentReminders(5);
    const recentScans = historyDb.getRecentScans(1);
    const settings = settingsDb.getAll();
    const thresholdHours = parseFloat(settings.threshold_hours || '3') || 3;
    const limit = parseInt(settings.chat_limit || '50', 10) || 50;

    const stateCounts = { ignored: 0, done: 0 };
    for (const row of chatStateDb.list()) {
      if (row.state in stateCounts) {
        stateCounts[row.state as keyof typeof stateCounts]++;
      }
    }

    const now = Date.now();
    const stats = {
      total: null as number | null,
      urgent: null as number | null,
      snoozed: stateCounts.ignored + stateCounts.done
    };

    try {
      const raw = await getRecentChats(limit);
      const analysis = chatAnalysis.statsForChats(raw, thresholdHours, now);
      stats.total = analysis.total;
      stats.urgent = analysis.urgent;
    } catch {
      /* stats remain null */
    }

    return c.json({
      status,
      recentReminders,
      stats,
      lastScan: recentScans[0] || null,
      nextScan: scheduler.getNextRunAt()
    });
  });

  app.get('/chats', async (c) => {
    const settings = settingsDb.getAll();
    const thresholdHours = parseFloat(settings.threshold_hours || '3') || 3;
    const limit = parseInt(settings.chat_limit || '50', 10) || 50;
    const status = getStatus();

    try {
      const raw = await getRecentChats(limit);
      const stateRows = chatStateDb.list();
      const stateById: Record<string, { state: string; until: number | null; createdAt: number }> =
        {};
      for (const row of stateRows) {
        stateById[row.id] = { state: row.state, until: row.until, createdAt: row.created_at };
      }
      const now = Date.now();
      const chats = raw.map((chat) => {
        const state = stateById[chat.id] || null;
        return chatAnalysis.enrichChat(chat, state, thresholdHours, now);
      });
      return c.json({ chats, status, nextScan: scheduler.getNextRunAt() });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return c.json({ chats: [], error: message, status, nextScan: scheduler.getNextRunAt() });
    }
  });

  app.post('/chats/:id/done', async (c) => {
    const id = c.req.param('id');
    const body = await c.req.json().catch(() => ({}));
    chatStateDb.add(id, (body as { name?: string }).name || id, 'done');
    return c.json({ ok: true });
  });

  app.post('/chats/:id/undone', async (c) => {
    chatStateDb.remove(c.req.param('id'));
    return c.json({ ok: true });
  });

  app.post('/chats/:id/ignore', async (c) => {
    const id = c.req.param('id');
    const body = await c.req.json().catch(() => ({}));
    chatStateDb.add(id, (body as { name?: string }).name || id, 'ignored');
    return c.json({ ok: true });
  });

  app.post('/chats/:id/unignore', async (c) => {
    chatStateDb.remove(c.req.param('id'));
    return c.json({ ok: true });
  });

  app.get('/settings', (c) => c.json(settingsDb.getAll()));

  app.put('/settings', async (c) => {
    const body = await c.req.json();
    const interval = parseInt(body.interval_minutes, 10);
    const limit = parseInt(body.chat_limit, 10);
    const threshold = parseInt(body.threshold_hours, 10);

    if (!Number.isFinite(interval) || interval < 1) {
      return c.json({ error: 'Scan interval must be at least 1 minute' }, 400);
    }
    if (!Number.isFinite(limit) || limit < 1) {
      return c.json({ error: 'Chat limit must be at least 1' }, 400);
    }
    if (!Number.isFinite(threshold) || threshold < 1) {
      return c.json({ error: 'Threshold must be at least 1 hour' }, 400);
    }

    settingsDb.set('interval_minutes', interval);
    settingsDb.set('chat_limit', limit);
    settingsDb.set('threshold_hours', threshold);
    try {
      scheduler.reschedule();
    } catch (err) {
      logger.error(`Failed to reschedule: ${err}`);
    }
    return c.json(settingsDb.getAll());
  });

  app.get('/notifications', (c) => c.json(settingsDb.getAll()));

  app.put('/notifications', async (c) => {
    const body = await c.req.json();

    function boolValue(name: string): string {
      return body[name] === true || body[name] === '1' ? '1' : '0';
    }

    function intValue(name: string, fallback: number): number {
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

    return c.json(settingsDb.getAll());
  });

  app.get('/history', (c) => {
    return c.json({
      reminders: historyDb.getRecentReminders(50),
      scans: historyDb.getRecentScans(50)
    });
  });

  app.get('/qr', (c) => {
    return c.json({
      status: getStatus(),
      qr: getQrDataUrl()
    });
  });

  app.post('/test-notification', async (c) => {
    const body = await c.req.json().catch(() => ({}));
    const title = (body as { title?: string }).title || 'Respondr test';
    const message = (body as { message?: string }).message || 'Test notification from Respondr';
    const results = await sendTest(title, message);
    return c.json({ ok: true, results });
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
      const message = err instanceof Error ? err.message : String(err);
      logger.error(`Reconnect failed: ${message}`);
      return c.json({ ok: false, error: message, status: getStatus() }, 500);
    }
  });

  app.post('/push/subscribe', async (c) => {
    const body = await c.req.json().catch(() => ({}));
    const sub = body as { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
    if (!sub.endpoint || !sub.keys?.p256dh || !sub.keys?.auth) {
      return c.json({ ok: false, error: 'Invalid subscription' }, 400);
    }
    pushSubscriptionsDb.addPushSubscription({
      endpoint: sub.endpoint,
      keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth }
    });
    return c.json({ ok: true });
  });

  app.post('/push/unsubscribe', async (c) => {
    const body = await c.req.json().catch(() => ({}));
    const endpoint = (body as { endpoint?: string }).endpoint;
    if (!endpoint) {
      return c.json({ ok: false, error: 'Invalid subscription' }, 400);
    }
    pushSubscriptionsDb.removePushSubscription(endpoint);
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
    const limit = parseInt(c.req.query('limit') || '500', 10);
    return c.json({
      level: logger.getLevel(),
      logs: logger.getLogs({ level, limit: Number.isFinite(limit) ? limit : 500 })
    });
  });

  app.put('/logs', async (c) => {
    const body = await c.req.json();
    const level = String(body.log_level || 'info').toLowerCase();
    settingsDb.set('log_level', level);
    logger.setLevel(level);
    logger.info(`Log level changed to ${level}`);
    return c.json({ level: logger.getLevel() });
  });

  return app;
}
