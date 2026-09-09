import { randomUUID } from 'node:crypto';
import { getDb } from './index.js';
import * as logger from '../lib/logger.js';

export const SCAN_LOCK_ID = 'scan';
export const SCAN_LOCK_STALE_MS = 10 * 60 * 1000;

export const ownerId = randomUUID();

/** Try to acquire the cross-process scan lock. Returns true when we own it. */
export function tryAcquireScanLock(now = Date.now()): boolean {
  const db = getDb();
  try {
    db.prepare('DELETE FROM scan_locks WHERE id = ? AND locked_at < ?').run(
      SCAN_LOCK_ID,
      now - SCAN_LOCK_STALE_MS
    );
    const result = db
      .prepare('INSERT OR IGNORE INTO scan_locks (id, owner, locked_at) VALUES (?, ?, ?)')
      .run(SCAN_LOCK_ID, ownerId, now);
    if (result.changes === 0) {
      const row = db.prepare('SELECT locked_at FROM scan_locks WHERE id = ?').get(SCAN_LOCK_ID) as
        | { locked_at: number }
        | undefined;
      const age = row ? now - row.locked_at : -1;
      logger.warn(`Scan lock held by another replica (age ${age}ms), skipping concurrent run`);
      return false;
    }
    return true;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error(`Scan lock acquire failed, running without lock: ${message}`);
    return true;
  }
}

export function releaseScanLock(): void {
  try {
    getDb().prepare('DELETE FROM scan_locks WHERE id = ? AND owner = ?').run(SCAN_LOCK_ID, ownerId);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error(`Scan lock release failed: ${message}`);
  }
}

export function resetScanLockForTests(): void {
  try {
    getDb().prepare('DELETE FROM scan_locks WHERE id = ?').run(SCAN_LOCK_ID);
  } catch {
    /* table may not exist in unit tests without initDb */
  }
}
