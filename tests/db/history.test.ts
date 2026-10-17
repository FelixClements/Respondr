import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { closeDb, initDb } from '../../src/db/index.js';
import * as historyDb from '../../src/db/history.js';

describe('pruneHistory', () => {
  let dbPath = '';

  beforeEach(() => {
    dbPath = path.join(os.tmpdir(), `respondr-history-${Date.now()}-${Math.random()}.db`);
    process.env.DB_PATH = dbPath;
    initDb();
  });

  afterEach(() => {
    closeDb();
    if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
    delete process.env.DB_PATH;
  });

  it('drops reminders and scans older than the retention window and keeps the rest', () => {
    const now = Date.UTC(2026, 5, 1);
    const old = now - historyDb.HISTORY_RETENTION_MS - 1;
    const recent = now - historyDb.HISTORY_RETENTION_MS + 1;
    historyDb.logReminder('a', 'Old', old);
    historyDb.logReminder('b', 'Recent', recent);
    historyDb.logScan(old, 1, 1);
    historyDb.logScan(recent, 2, 1);

    historyDb.pruneHistory(now);

    expect(historyDb.getRecentReminders().map((r) => r.chat_name)).toEqual(['Recent']);
    expect(historyDb.getRecentScans().map((s) => s.run_at)).toEqual([recent]);
  });
});
