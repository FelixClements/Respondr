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
});
