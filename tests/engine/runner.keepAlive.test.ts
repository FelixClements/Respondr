import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { KEEPALIVE_STALE_ERROR } from '../../src/whatsapp/keepAlive.js';

const calls: string[] = [];
let isReady = true;
let keepAliveImpl: () => Promise<void> = async () => {
  calls.push('keepAlive');
};

vi.mock('../../src/whatsapp/create.js', () => ({
  getAppDeps: () => ({
    chatSource: {
      getRecentChats: async () => {
        calls.push('scrape');
        return [];
      }
    },
    whatsapp: {
      getStatus: () => ({ status: isReady ? 'ready' : 'disconnected', isReady }),
      keepAlive: () => keepAliveImpl()
    }
  })
}));

describe('runOnce keepalive', () => {
  let dbPath = '';

  beforeEach(async () => {
    calls.length = 0;
    isReady = true;
    keepAliveImpl = async () => {
      calls.push('keepAlive');
    };
    dbPath = path.join(os.tmpdir(), `respondr-scan-${Date.now()}-${Math.random()}.db`);
    process.env.DB_PATH = dbPath;
    const { initDb } = await import('../../src/db/index.js');
    const settingsDb = await import('../../src/db/settings.js');
    const { resetScanForTests } = await import('../../src/engine/runner.js');
    initDb();
    settingsDb.seedDefaults();
    resetScanForTests();
  });

  afterEach(async () => {
    const { closeDb } = await import('../../src/db/index.js');
    closeDb();
    if (dbPath && fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
    delete process.env.DB_PATH;
  });

  it('pings WhatsApp before scraping chats', async () => {
    const { runOnce } = await import('../../src/engine/runner.js');
    const result = await runOnce();
    expect(result.error).toBeNull();
    expect(calls).toEqual(['keepAlive', 'scrape']);
  });

  it('does not scrape when keepalive restarts a stale session', async () => {
    keepAliveImpl = async () => {
      calls.push('keepAlive');
      throw new Error(KEEPALIVE_STALE_ERROR);
    };
    const { runOnce } = await import('../../src/engine/runner.js');
    const result = await runOnce();
    expect(result.error).toBe(KEEPALIVE_STALE_ERROR);
    expect(calls).toEqual(['keepAlive']);
  });
});
