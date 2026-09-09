import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { closeDb, initDb } from '../../src/db/index.js';
import {
  tryAcquireScanLock,
  releaseScanLock,
  resetScanLockForTests,
  SCAN_LOCK_STALE_MS
} from '../../src/db/scanLock.js';

describe('scanLock', () => {
  let dbPath = '';

  beforeEach(() => {
    dbPath = path.join(os.tmpdir(), `respondr-scanlock-${Date.now()}-${Math.random()}.db`);
    process.env.DB_PATH = dbPath;
    initDb();
    resetScanLockForTests();
  });

  afterEach(() => {
    closeDb();
    if (dbPath && fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
    delete process.env.DB_PATH;
  });

  it('grants the first acquirer and denies the second', () => {
    expect(tryAcquireScanLock()).toBe(true);
    expect(tryAcquireScanLock()).toBe(false);
  });

  it('releases and re-acquires', () => {
    expect(tryAcquireScanLock()).toBe(true);
    releaseScanLock();
    expect(tryAcquireScanLock()).toBe(true);
  });

  it('expires stale locks', () => {
    const old = Date.now() - SCAN_LOCK_STALE_MS - 1000;
    expect(tryAcquireScanLock(old)).toBe(true);
    // Fresh attempt sees a stale row, clears it, and acquires.
    expect(tryAcquireScanLock()).toBe(true);
  });
});
