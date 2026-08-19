import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { serveStatic } from '@hono/node-server/serve-static';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as logger from '../lib/logger.js';
import { auth, ensureBootstrapUser, createInitialUser } from './auth.js';
import { buildApiApp } from './api.js';
import { requireAuth } from './middleware.js';
import type { AppVariables } from './middleware.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WEB_BUILD = path.join(__dirname, '../../web/build');

export function createApp() {
  const app = new Hono<{ Variables: AppVariables }>();

  app.use('*', async (c, next) => {
    logger.info(`${c.req.method} ${c.req.path}`);
    await next();
  });

  // Better Auth — must be before catch-all routes
  app.all('/api/auth/*', (c) => auth.handler(c.req.raw));

  // One-time setup (public, only when no users exist)
  app.post('/api/setup', async (c) => {
    const { hasUsers } = await import('./auth.js');
    if (await hasUsers()) {
      return c.json({ error: 'Already configured' }, 403);
    }
    const body = await c.req.json().catch(() => ({}));
    const username = String((body as { username?: string }).username || '').trim();
    const password = String((body as { password?: string }).password || '');
    if (!username || password.length < 6) {
      return c.json({ error: 'Username and password (min 6 chars) required' }, 400);
    }
    try {
      await createInitialUser(username, password);
      return c.json({ ok: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return c.json({ error: message }, 400);
    }
  });

  app.get('/api/auth-status', async (c) => {
    const { hasUsers } = await import('./auth.js');
    return c.json({ hasUsers: await hasUsers() });
  });

  // Protected API routes
  app.use('/api/*', async (c, next) => {
    if (c.req.path.startsWith('/api/auth')) return next();
    return requireAuth(c, next);
  });

  app.route('/api', buildApiApp());

  // Static files from SvelteKit build (skip API paths)
  app.use('*', async (c, next) => {
    if (c.req.path.startsWith('/api')) return next();
    return serveStatic({ root: WEB_BUILD })(c, next);
  });

  // SPA fallback for client-side routes
  app.get('*', async (c) => {
    if (c.req.path.startsWith('/api')) return c.notFound();
    const indexPath = path.join(WEB_BUILD, 'index.html');
    try {
      const file = await import('node:fs/promises').then((fs) => fs.readFile(indexPath, 'utf8'));
      return c.html(file);
    } catch {
      return c.text('Frontend not built. Run: npm run build:web', 503);
    }
  });

  app.onError((err, c) => {
    if (err instanceof HTTPException) {
      return err.getResponse();
    }
    logger.error(err instanceof Error ? err.stack || err.message : String(err));
    return c.text('Internal Server Error', 500);
  });

  return app;
}

export async function prepareApp() {
  await ensureBootstrapUser();
  return createApp();
}
