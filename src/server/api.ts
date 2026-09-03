import { Hono } from 'hono';
import { createAppServices } from '../application/appServices.js';
import { getAppDeps } from '../whatsapp/create.js';
import type { AppVariables } from './middleware.js';

const MANUAL_RUN_COOLDOWN_MS = 60 * 1000;

export function buildApiApp() {
  const app = new Hono<{ Variables: AppVariables }>();
  const services = createAppServices(getAppDeps());
  let lastManualRun = 0;

  app.get('/status', (c) => c.json(services.getStatusPayload()));
  app.get('/dashboard', async (c) => c.json(await services.getDashboard()));
  app.get('/chats', async (c) => c.json(await services.getChats()));

  app.post('/chats/:id/done', async (c) => {
    const body = await c.req.json().catch(() => ({}));
    return c.json(services.markDone(c.req.param('id'), (body as { name?: string }).name || c.req.param('id')));
  });
  app.post('/chats/:id/undone', (c) => c.json(services.markUndone(c.req.param('id'))));
  app.post('/chats/:id/ignore', async (c) => {
    const body = await c.req.json().catch(() => ({}));
    return c.json(services.markIgnored(c.req.param('id'), (body as { name?: string }).name || c.req.param('id')));
  });
  app.post('/chats/:id/unignore', (c) => c.json(services.markUnignored(c.req.param('id'))));

  app.get('/settings', (c) => c.json(services.getCoreSettings()));
  app.put('/settings', async (c) => {
    const result = services.updateCoreSettings(await c.req.json());
    if ('error' in result) return c.json({ error: result.error }, result.status);
    return c.json(result.data);
  });

  app.get('/notifications', (c) => c.json(services.getNotifications()));
  app.put('/notifications', async (c) => {
    try {
      return c.json(services.updateNotifications(await c.req.json()));
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return c.json({ error: message }, 400);
    }
  });

  app.get('/history', (c) => c.json(services.getHistory()));
  app.get('/qr', (c) => c.json(services.getQr()));

  app.post('/test-notification', async (c) => {
    const body = await c.req.json().catch(() => ({}));
    const title = (body as { title?: string }).title || 'Respondr test';
    const message = (body as { message?: string }).message || 'Test notification from Respondr';
    return c.json(await services.sendTestNotification(title, message));
  });

  app.post('/run', async (c) => {
    const now = Date.now();
    if (now - lastManualRun < MANUAL_RUN_COOLDOWN_MS) {
      return c.text('Please wait before triggering another run', 429);
    }
    lastManualRun = now;
    return c.json(await services.runScan());
  });

  app.post('/reconnect', async (c) => {
    const result = await services.reconnect();
    return c.json(result, result.ok ? 200 : 500);
  });

  app.post('/push/subscribe', async (c) => {
    const result = services.subscribePush(await c.req.json().catch(() => ({})));
    return c.json(result, result.status);
  });
  app.post('/push/unsubscribe', async (c) => {
    const body = await c.req.json().catch(() => ({}));
    const result = services.unsubscribePush((body as { endpoint?: string }).endpoint);
    return c.json(result, result.status);
  });
  app.get('/push/config', (c) => c.json(services.getPushConfig()));
  app.post('/push/test', async (c) => c.json(await services.testPush()));

  app.get('/logs', (c) => {
    const limit = parseInt(c.req.query('limit') || '500', 10);
    return c.json(services.getLogs(c.req.query('level'), Number.isFinite(limit) ? limit : 500));
  });
  app.put('/logs', async (c) => {
    const body = await c.req.json();
    const level = String(body.log_level || 'info').toLowerCase();
    return c.json(services.updateLogLevel(level));
  });

  return app;
}
