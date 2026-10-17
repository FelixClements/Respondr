import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const reconnect = vi.fn(async () => undefined);

vi.mock('../../src/whatsapp/session.js', () => ({
  getStatus: () => ({ status: 'disconnected', isReady: false, reconnectAt: null }),
  getRecentChats: async () => [],
  keepAlive: async () => undefined,
  reconnect: () => reconnect()
}));

const { initDb, closeDb } = await import('../../src/db/index.js');
const settingsDb = await import('../../src/db/settings.js');
const { resetScanForTests } = await import('../../src/engine/runner.js');
const { buildApiApp } = await import('../../src/server/api.js');

describe('API routes', () => {
  let dbPath = '';

  beforeEach(() => {
    dbPath = path.join(os.tmpdir(), `respondr-api-${Date.now()}-${Math.random()}.db`);
    process.env.DB_PATH = dbPath;
    initDb();
    settingsDb.seedDefaults();
    resetScanForTests();
    reconnect.mockClear();
  });

  afterEach(() => {
    closeDb();
    if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
    delete process.env.DB_PATH;
  });

  it('POST /run reports a scan that could not run, then enforces the cooldown', async () => {
    const app = buildApiApp();
    const first = await app.request('/run', { method: 'POST' });
    expect(first.status).toBe(200);
    expect(await first.json()).toMatchObject({ error: 'WhatsApp client is not ready' });

    const second = await app.request('/run', { method: 'POST' });
    expect(second.status).toBe(429);
    expect(second.headers.get('Retry-After')).toMatch(/^\d+$/);
  });

  it('POST /reconnect starts a reconnect and returns 202 at once', async () => {
    const res = await buildApiApp().request('/reconnect', { method: 'POST' });
    expect(res.status).toBe(202);
    expect(await res.json()).toEqual({ ok: true });
    expect(reconnect).toHaveBeenCalledTimes(1);
  });

  it('GET /status includes the next auto-reconnect time', async () => {
    const res = await buildApiApp().request('/status');
    expect(await res.json()).toMatchObject({ status: 'disconnected', isReady: false, reconnectAt: null });
  });
});
