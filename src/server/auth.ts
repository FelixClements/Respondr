import { betterAuth } from 'better-auth';
import { username } from 'better-auth/plugins';
import { getDb } from '../db/index.js';
import * as logger from '../lib/logger.js';

export const auth = betterAuth({
  appName: 'Respondr',
  baseURL: process.env.BETTER_AUTH_URL || `http://localhost:${process.env.PORT || 9595}`,
  secret:
    process.env.BETTER_AUTH_SECRET || 'dev-secret-change-me-in-production-32chars',
  database: getDb(),
  emailAndPassword: {
    enabled: true,
    disableSignUp: false,
    minPasswordLength: 6
  },
  disabledPaths: ['/sign-up/email'],
  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24
  },
  plugins: [username({ displayUsername: false })]
});

export async function createInitialUser(username: string, password: string): Promise<void> {
  if (await hasUsers()) {
    throw new Error('Account already configured');
  }
  await auth.api.signUpEmail({
    body: {
      email: `${username}@local.respondr`,
      name: username,
      password,
      username
    } as never
  });
}

export type Session = typeof auth.$Infer.Session;

export async function ensureBootstrapUser(): Promise<void> {
  const envUser = process.env.DASHBOARD_USER;
  const envPassword = process.env.DASHBOARD_PASSWORD;
  if (!envUser || !envPassword) return;

  try {
    const row = getDb().prepare('SELECT COUNT(*) as count FROM user').get() as { count: number };
    if (row.count > 0) return;

    await createInitialUser(envUser, envPassword);
    logger.info(`Bootstrap user created from DASHBOARD_USER env: ${envUser}`);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error(`Failed to bootstrap user: ${message}`);
  }
}

export async function hasUsers(): Promise<boolean> {
  try {
    const row = getDb().prepare('SELECT COUNT(*) as count FROM user').get() as { count: number };
    return row.count > 0;
  } catch {
    return false;
  }
}
