import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { serveStatic } from '@hono/node-server/serve-static';
import { secureHeaders } from 'hono/secure-headers';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as logger from '../lib/logger.js';
import { auth, ensureBootstrapUser, createInitialUser, runAuthMigrations } from './auth.js';
import { buildApiApp } from './api.js';
import { requireAuth } from './middleware.js';
import type { AppVariables } from './middleware.js';
import {
  authStatusRateLimiter,
  setupRateLimiter,
  signInRateLimiter
} from './rateLimit.js';
import { extractClientIp } from './clientIp.js';
import { verifySetupToken } from './setupToken.js';
import { isHttpSetupAllowed, requiresSetupToken } from './secrets.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WEB_BUILD = path.join(__dirname, '../../web/build');
const MIN_PASSWORD_LENGTH = 8;

export function createApp() {
  const app = new Hono<{ Variables: AppVariables }>();

  app.use(
    '*',
    secureHeaders({
      contentSecurityPolicy: {
        defaultSrc: ["'self'"],
        // Pragmatic allowlist: SvelteKit adapter-static emits inline bootstrap
        // scripts, so 'unsafe-inline' is required until nonce plumbing lands.
        // Theme toggle is externalized to /theme-init.js to stay under 'self'.
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        imgSrc: ["'self'", 'data:', 'blob:'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
        connectSrc: ["'self'"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
        frameAncestors: ["'none'"]
      },
      permissionsPolicy: {
        camera: [],
        microphone: [],
        geolocation: []
      }
    })
  );
  app.use('*', async (c, next) => {
    logger.info(`${c.req.method} ${c.req.path}`);
    await next();
  });

  // Better Auth — must be before catch-all routes
  app.all('/api/auth/*', (c) => {
    const path = c.req.path;
    if (path === '/api/auth/is-username-available' || path.startsWith('/api/auth/sign-up')) {
      return c.json({ error: 'Endpoint disabled' }, 404);
    }
    const isSignIn = path === '/api/auth/sign-in' || path.startsWith('/api/auth/sign-in/');
    if (c.req.method === 'POST' && isSignIn) {
      const rateLimit = signInRateLimiter.check(extractClientIp(c));
      if (!rateLimit.allowed) {
        return c.json({ error: 'Too many sign-in attempts' }, 429, {
          'Retry-After': String(rateLimit.retryAfterSeconds)
        });
      }
    }
    return auth.handler(c.req.raw);
  });

  // One-time setup (public, only when no users exist)
  app.post('/api/setup', async (c) => {
    const clientIp = extractClientIp(c);
    const rateLimit = setupRateLimiter.check(clientIp);
    if (!rateLimit.allowed) {
      return c.json({ error: 'Too many setup attempts' }, 429, {
        'Retry-After': String(rateLimit.retryAfterSeconds)
      });
    }

    if (!isHttpSetupAllowed()) {
      return c.json(
        {
          error:
            'HTTP setup is disabled on this bind address. Set DASHBOARD_USER and DASHBOARD_PASSWORD, or configure SETUP_TOKEN.'
        },
        503
      );
    }

    const { hasUsers } = await import('./auth.js');
    try {
      if (await hasUsers()) {
        return c.json({ error: 'Already configured' }, 403);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error(`Setup status check failed: ${message}`);
      return c.json({ error: 'Setup status check failed' }, 500);
    }

    const body = await c.req.json().catch(() => ({}));
    const bodyRecord = body as { username?: string; password?: string; setupToken?: string };
    const headerToken = c.req.header('x-setup-token');
    if (!verifySetupToken(headerToken, bodyRecord.setupToken)) {
      return c.json({ error: 'Invalid setup token' }, 401);
    }

    const username = String(bodyRecord.username || '').trim();
    const password = String(bodyRecord.password || '');
    if (!username || password.length < MIN_PASSWORD_LENGTH) {
      return c.json(
        { error: `Username and password (min ${MIN_PASSWORD_LENGTH} chars) required` },
        400
      );
    }
    try {
      await createInitialUser(username, password);
      return c.json({ ok: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error(`Setup failed for user ${username}: ${message}`);
      return c.json({ error: 'Setup failed' }, 400);
    }
  });

  app.get('/api/auth-status', async (c) => {
    const clientIp = extractClientIp(c);
    const rateLimit = authStatusRateLimiter.check(clientIp);
    if (!rateLimit.allowed) {
      return c.json({ error: 'Too many requests' }, 429, {
        'Retry-After': String(rateLimit.retryAfterSeconds)
      });
    }

    const { hasUsers } = await import('./auth.js');
    try {
      return c.json({
        hasUsers: await hasUsers(),
        requiresSetupToken: requiresSetupToken()
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error(`Auth status check failed: ${message}`);
      return c.json({ error: 'Status check failed' }, 500);
    }
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
  try {
    await runAuthMigrations();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const uid = typeof process.getuid === 'function' ? process.getuid() : 'unknown';
    logger.error(
      `Better Auth migrations failed as uid ${uid} (DB_PATH=${process.env.DB_PATH || 'unset'}, DATA_DIR=${process.env.DATA_DIR || './data'}): ${message}`
    );
    throw err;
  }
  await ensureBootstrapUser();
  return createApp();
}
