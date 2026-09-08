import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { closeDb, initDb } from '../../src/db/index.js';
import {
  addPushSubscription,
  getAllPushSubscriptions,
  removePushSubscription
} from '../../src/db/pushSubscriptions.js';

describe('pushSubscriptions', () => {
  let dbPath = '';

  beforeEach(() => {
    dbPath = path.join(os.tmpdir(), `respondr-push-test-${Date.now()}-${Math.random()}.db`);
    process.env.DB_PATH = dbPath;
    initDb();
  });

  afterEach(() => {
    closeDb();
    if (dbPath && fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
    delete process.env.DB_PATH;
  });

  it('adds and retrieves push subscriptions', () => {
    addPushSubscription({
      endpoint: 'https://push.example/device1',
      keys: { p256dh: 'key1', auth: 'auth1' }
    });

    const subs = getAllPushSubscriptions();
    expect(subs).toHaveLength(1);
    expect(subs[0].endpoint).toBe('https://push.example/device1');
    expect(subs[0].p256dh).toBe('key1');
    expect(subs[0].auth).toBe('auth1');
  });

  it('removes push subscriptions', () => {
    addPushSubscription({
      endpoint: 'https://push.example/device1',
      keys: { p256dh: 'key1', auth: 'auth1' }
    });
    removePushSubscription('https://push.example/device1');
    expect(getAllPushSubscriptions()).toHaveLength(0);
  });

  it('caps push subscriptions at 25 devices and prunes oldest', () => {
    for (let i = 1; i <= 30; i++) {
      addPushSubscription({
        endpoint: `https://push.example/device${i}`,
        keys: { p256dh: `key${i}`, auth: `auth${i}` }
      });
    }

    const subs = getAllPushSubscriptions();
    expect(subs).toHaveLength(25);
    // Device 30 should be present (newest)
    expect(subs.some((s) => s.endpoint === 'https://push.example/device30')).toBe(true);
    // Oldest devices (e.g. device 1-5) should be pruned
    expect(subs.some((s) => s.endpoint === 'https://push.example/device1')).toBe(false);
  });
});
