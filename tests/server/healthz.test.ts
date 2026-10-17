import { afterEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

vi.mock('../../src/server/auth.js', () => ({
  auth: { handler: vi.fn() },
  ensureBootstrapUser: vi.fn(),
  runAuthMigrations: vi.fn(),
  MIN_PASSWORD_LENGTH: 8,
  createInitialUser: vi.fn(),
  hasUsers: vi.fn()
}));

const { initDb, closeDb } = await import('../../src/db/index.js');
const { createApp } = await import('../../src/server/index.js');

describe('GET /healthz', () => {
  let dbPath = '';

  afterEach(() => {
    closeDb();
    if (dbPath && fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
    delete process.env.DB_PATH;
  });

  it('answers without a session when the database is readable', async () => {
    dbPath = path.join(os.tmpdir(), `respondr-healthz-${Date.now()}-${Math.random()}.db`);
    process.env.DB_PATH = dbPath;
    initDb();
    const res = await createApp().request('/healthz');
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });
});
