import { createMiddleware } from 'hono/factory';
import { auth, type Session } from './auth.js';

export type AppVariables = {
  session: Session | null;
  user: Session['user'] | null;
};

export const requireAuth = createMiddleware<{ Variables: AppVariables }>(async (c, next) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  c.set('session', session);
  c.set('user', session.user);
  await next();
});
