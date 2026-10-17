import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

describe('createInitialUser', () => {
  let dbPath = '';

  beforeEach(async () => {
    vi.resetModules();
    dbPath = path.join(os.tmpdir(), `respondr-auth-${Date.now()}-${Math.random()}.db`);
    process.env.DB_PATH = dbPath;
    process.env.BETTER_AUTH_SECRET = 'a'.repeat(32);
    process.env.NODE_ENV = 'test';
    delete process.env.DASHBOARD_USER;
    delete process.env.DASHBOARD_PASSWORD;

    const { initDb } = await import('../../src/db/index.js');
    initDb();
    const { runAuthMigrations } = await import('../../src/server/auth.js');
    await runAuthMigrations();
  });

  afterEach(async () => {
    const { closeDb } = await import('../../src/db/index.js');
    closeDb();
    for (const extra of ['', '-wal', '-shm']) {
      const file = `${dbPath}${extra}`;
      if (dbPath && fs.existsSync(file)) fs.unlinkSync(file);
    }
    delete process.env.DB_PATH;
  });

  it('creates the first admin even though public email sign-up is disabled', async () => {
    const { createInitialUser, hasUsers, auth } = await import('../../src/server/auth.js');

    await expect(
      auth.api.signUpEmail({
        body: {
          email: 'adminodin@local.respondr',
          name: 'adminodin',
          password: 'password12345',
          username: 'adminodin'
        } as never
      })
    ).rejects.toMatchObject({ message: expect.stringMatching(/sign up is not enabled/i) });

    await createInitialUser('adminodin', 'password12345');
    expect(await hasUsers()).toBe(true);

    const signedIn = await auth.api.signInUsername({
      body: { username: 'adminodin', password: 'password12345' }
    });
    expect(signedIn?.user).toMatchObject({ username: 'adminodin' });
  });

  it('bootstraps DASHBOARD_USER when the user table is empty', async () => {
    process.env.DASHBOARD_USER = 'adminodin';
    process.env.DASHBOARD_PASSWORD = 'password12345';
    const { ensureBootstrapUser, hasUsers, auth } = await import('../../src/server/auth.js');

    await ensureBootstrapUser();
    expect(await hasUsers()).toBe(true);

    const signedIn = await auth.api.signInUsername({
      body: { username: 'adminodin', password: 'password12345' }
    });
    expect(signedIn?.user).toMatchObject({ username: 'adminodin' });
  });

  it('rejects an email as the dashboard username', async () => {
    const { createInitialUser, hasUsers } = await import('../../src/server/auth.js');
    await expect(createInitialUser('mvr600@gmail.com', 'password12345')).rejects.toThrow(
      /Username is invalid/
    );
    expect(await hasUsers()).toBe(false);
  });

  it('removes the user again when linking the password fails, so setup can be retried', async () => {
    const { createInitialUser, hasUsers, auth } = await import('../../src/server/auth.js');
    const ctx = await auth.$context;
    const linkSpy = vi
      .spyOn(ctx.internalAdapter, 'linkAccount')
      .mockRejectedValueOnce(new Error('disk full'));

    await expect(createInitialUser('adminodin', 'password12345')).rejects.toThrow('disk full');
    expect(await hasUsers()).toBe(false);

    linkSpy.mockRestore();
    await createInitialUser('adminodin', 'password12345');
    const signedIn = await auth.api.signInUsername({
      body: { username: 'adminodin', password: 'password12345' }
    });
    expect(signedIn?.user).toMatchObject({ username: 'adminodin' });
  });
});

describe('auth migrations on a Better Auth 1.7.1 database', () => {
  let dbPath = '';

  afterEach(async () => {
    const { closeDb } = await import('../../src/db/index.js');
    closeDb();
    for (const extra of ['', '-wal', '-shm']) {
      const file = `${dbPath}${extra}`;
      if (dbPath && fs.existsSync(file)) fs.unlinkSync(file);
    }
    delete process.env.DB_PATH;
  });

  it('drops the legacy NOT NULL account.issuer column so setup still works', async () => {
    vi.resetModules();
    dbPath = path.join(os.tmpdir(), `respondr-auth-legacy-${Date.now()}-${Math.random()}.db`);
    process.env.DB_PATH = dbPath;
    process.env.BETTER_AUTH_SECRET = 'a'.repeat(32);
    process.env.NODE_ENV = 'test';

    const { initDb, getDb } = await import('../../src/db/index.js');
    initDb();
    // Tables exactly as Better Auth 1.7.1 created them.
    getDb().exec(`
      CREATE TABLE "user" ("id" text not null primary key, "name" text not null, "email" text not null unique, "emailVerified" integer not null, "image" text, "createdAt" date not null, "updatedAt" date not null, "username" text unique);
      CREATE TABLE "account" ("id" text not null primary key, "issuer" text not null, "accountId" text not null, "providerId" text not null, "userId" text not null references "user" ("id") on delete cascade, "accessToken" text, "refreshToken" text, "idToken" text, "accessTokenExpiresAt" date, "refreshTokenExpiresAt" date, "scope" text, "password" text, "createdAt" date not null, "updatedAt" date not null);
      CREATE INDEX "account_userId_idx" on "account" ("userId");
      CREATE UNIQUE INDEX "account_issuer_accountId_uidx" on "account" ("issuer", "accountId");
    `);

    const { runAuthMigrations, createInitialUser, auth } = await import('../../src/server/auth.js');
    await runAuthMigrations();
    await runAuthMigrations();

    const columns = getDb().prepare("SELECT name FROM pragma_table_info('account')").all() as {
      name: string;
    }[];
    expect(columns.map((c) => c.name)).not.toContain('issuer');
    const indexes = getDb().prepare("SELECT name FROM pragma_index_list('account')").all() as {
      name: string;
    }[];
    expect(indexes.map((i) => i.name)).toContain('account_userId_idx');
    expect(indexes.map((i) => i.name)).not.toContain('account_issuer_accountId_uidx');

    await createInitialUser('adminodin', 'password12345');
    const signedIn = await auth.api.signInUsername({
      body: { username: 'adminodin', password: 'password12345' }
    });
    expect(signedIn?.user).toMatchObject({ username: 'adminodin' });
  });
});
