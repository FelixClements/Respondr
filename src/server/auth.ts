import { betterAuth } from 'better-auth';
import { createLocalAccountIssuer } from 'better-auth/db';
import { username } from 'better-auth/plugins';
import { getDb, hasUsers as dbHasUsers } from '../db/index.js';
import { runAuthMigrationsForOptions } from '../db/authMigrations.js';
import * as logger from '../lib/logger.js';
import { getAuthSecret, isProduction } from './secrets.js';

const USERNAME_PATTERN = /^[a-zA-Z0-9_.]+$/;
const MIN_USERNAME_LENGTH = 3;
const MAX_USERNAME_LENGTH = 30;
const MIN_PASSWORD_LENGTH = 8;

const baseURL = process.env.BETTER_AUTH_URL || `http://localhost:${process.env.PORT || 9595}`;
const localhostOrigin = `http://localhost:${process.env.PORT || 9595}`;

export const auth = betterAuth({
  appName: 'Respondr',
  baseURL,
  trustedOrigins: isProduction() ? [baseURL] : [...new Set([baseURL, localhostOrigin])],
  secret: getAuthSecret(),
  database: getDb(),
  emailAndPassword: {
    enabled: true,
    disableSignUp: true,
    minPasswordLength: 8
  },
  disabledPaths: ['/sign-up/email', '/is-username-available'],
  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24
  },
  databaseHooks: {
    user: {
      create: {
        before: async () => {
          const row = getDb().prepare('SELECT COUNT(*) as count FROM user').get() as {
            count: number;
          };
          if (row.count >= 1) {
            throw new Error('Account creation is disabled');
          }
        }
      }
    }
  },
  plugins: [username({ displayUsername: false })]
});

export async function createInitialUser(username: string, password: string): Promise<void> {
  if (await hasUsers()) {
    throw new Error('Account already configured');
  }
  const trimmed = username.trim();
  if (
    trimmed.length < MIN_USERNAME_LENGTH ||
    trimmed.length > MAX_USERNAME_LENGTH ||
    !USERNAME_PATTERN.test(trimmed)
  ) {
    throw new Error('Username is invalid');
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new Error('Password is too short');
  }

  // Public sign-up is disabled. Create the first admin through the internal
  // adapter so /api/setup and DASHBOARD_* bootstrap still work.
  const ctx = await auth.$context;
  const hash = await ctx.password.hash(password);
  const normalizedUsername = trimmed.toLowerCase();
  const createdUser = await ctx.internalAdapter.createUser(
    {
      email: `${normalizedUsername}@local.respondr`,
      name: trimmed,
      username: normalizedUsername,
      emailVerified: true
    },
    { method: 'email-password' }
  );
  if (!createdUser) {
    throw new Error('Failed to create user');
  }
  await ctx.internalAdapter.linkAccount({
    userId: createdUser.id,
    providerId: 'credential',
    issuer: createLocalAccountIssuer('credential'),
    accountId: createdUser.id,
    password: hash
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
    throw new Error(`Failed to bootstrap DASHBOARD_USER admin: ${message}`);
  }
}

export async function hasUsers(): Promise<boolean> {
  // Single source of truth lives in src/db/index.ts; keep this async wrapper
  // for existing callers (routes, tests) so fail-closed semantics stay in sync.
  return dbHasUsers();
}

export async function runAuthMigrations(): Promise<void> {
  return runAuthMigrationsForOptions(auth.options);
}

