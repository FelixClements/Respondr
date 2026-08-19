import { createMiddleware } from 'hono/factory';
import { auth, type Session } from './auth.js';

export type AppVariables = {
  session: Session | null;
  user: Session['user'] | null;
};

export const sessionMiddleware = createMiddleware<{ Variables: AppVariables }>(async (c, next) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  c.set('session', session);
  c.set('user', session?.user ?? null);
  await next();
});

export const requireAuth = createMiddleware<{ Variables: AppVariables }>(async (c, next) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  c.set('session', session);
  c.set('user', session.user);
  await next();
});

export const publicPaths = new Set([
  '/api/auth',
  '/manifest.webmanifest',
  '/manifest.json',
  '/sw.js',
  '/workbox',
  '/icon-192.png',
  '/icon-512.png',
  '/icon-maskable-192.png',
  '/icon-maskable-512.png',
  '/icon.svg',
  '/icon-maskable.svg',
  '/favicon.ico',
  '/robots.txt'
]);

export function isPublicPath(path: string): boolean {
  if (publicPaths.has(path)) return true;
  if (path.startsWith('/api/auth')) return true;
  if (path.startsWith('/_app/')) return true;
  if (path.startsWith('/workbox-')) return true;
  if (/\.(js|css|png|svg|ico|woff2?|webmanifest|map)$/.test(path)) return true;
  return false;
}
