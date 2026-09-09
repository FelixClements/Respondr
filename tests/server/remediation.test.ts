import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { closeDb, initDb, hasUsers } from '../../src/db/index.js';
import * as settingsDb from '../../src/db/settings.js';
import {
  addPushSubscription,
  getAllPushSubscriptions,
  hasPushSubscription
} from '../../src/db/pushSubscriptions.js';
import { createAppServices } from '../../src/application/appServices.js';
import { checkPushKeys } from '../../src/lib/outboundUrl.js';
import {
  assertNtfyTopic,
  clampGotifyPriority,
  clampNtfyPriority,
  NTFY_TOPIC_PATTERN
} from '../../src/notifications/ntfyTopic.js';
import {
  seedNotificationSettingsFromEnv,
  getNotificationSettings
} from '../../src/notifications/settings.js';
import { resetScanForTests, SCAN_BUSY_ERROR } from '../../src/engine/runner.js';
import { isValidIp } from '../../src/server/clientIp.js';
import { isLogLevel } from '../../src/lib/logger.js';

const validKeys = { p256dh: 'A'.repeat(87), auth: 'B'.repeat(22) };

function stubServices() {
  return createAppServices({
    chatSource: { getRecentChats: async () => [] },
    whatsapp: {
      getStatus: () => ({ status: 'ready', isReady: true }),
      getHealth: () => ({
        whatsapp: { ok: true, detail: 'connected' },
        puppeteer: { ok: true, detail: 'connected' },
        chrome: { ok: true, detail: 'pid 1' }
      }),
      restartClient: async () => undefined,
      getQrDataUrl: () => null
    }
  } as never);
}

describe('remediation', () => {
  let dbPath = '';

  beforeEach(() => {
    dbPath = path.join(os.tmpdir(), `respondr-remed-${Date.now()}-${Math.random()}.db`);
    process.env.DB_PATH = dbPath;
    initDb();
    settingsDb.seedDefaults();
    resetScanForTests();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    closeDb();
    if (dbPath && fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
    delete process.env.DB_PATH;
    delete process.env.NTFY_TOPIC;
    delete process.env.NTFY_SERVER;
    delete process.env.NTFY_PRIORITY;
    delete process.env.GOTIFY_URL;
    delete process.env.GOTIFY_TOKEN;
    delete process.env.GOTIFY_PRIORITY;
  });

  it('clamps core settings and rejects malformed bodies', () => {
    const services = stubServices();
    expect(services.updateCoreSettings(null as never)).toMatchObject({ status: 400 });
    expect(services.updateCoreSettings([] as never)).toMatchObject({ status: 400 });
    expect(
      services.updateCoreSettings({ interval_minutes: 120, chat_limit: 50, threshold_hours: 3 })
    ).toMatchObject({ status: 400 });
    expect(
      services.updateCoreSettings({ interval_minutes: 30, chat_limit: 999999, threshold_hours: 3 })
    ).toMatchObject({ status: 400 });
    expect(
      services.updateCoreSettings({ interval_minutes: 30, chat_limit: 50, threshold_hours: 0.5 })
    ).toMatchObject({ status: 400 });
    const ok = services.updateCoreSettings({
      interval_minutes: 15,
      chat_limit: 50,
      threshold_hours: 2.5
    });
    expect(ok.status).toBe(200);
  });

  it('rejects invalid log levels', () => {
    const services = stubServices();
    expect(() => services.updateLogLevel('verbose')).toThrow(/Invalid log level/);
    expect(isLogLevel('debug')).toBe(true);
    expect(isLogLevel('verbose')).toBe(false);
  });

  it('ntfy topic pattern allows tildes and rejects traversal', () => {
    expect(NTFY_TOPIC_PATTERN.test('alerts~v2')).toBe(true);
    expect(() => assertNtfyTopic('../evil')).toThrow(/tildes/);
    expect(() => clampNtfyPriority('NaN')).toThrow();
    expect(() => clampNtfyPriority(9)).toThrow(/1 and 5/);
    expect(() => clampGotifyPriority(11)).toThrow(/0 and 10/);
    expect(clampNtfyPriority(3)).toBe(3);
  });

  it('seed rejects invalid env topics fail-closed', () => {
    process.env.NTFY_TOPIC = '../evil';
    seedNotificationSettingsFromEnv();
    const settings = getNotificationSettings();
    expect(settings.ntfy.topic).toBe('');
    expect(settings.ntfy.enabled).toBe(false);
  });

  it('push prune is deterministic on created_at ties (id DESC)', () => {
    const fixed = Date.now();
    const spy = vi.spyOn(Date, 'now').mockReturnValue(fixed);
    try {
      for (let i = 1; i <= 26; i++) {
        addPushSubscription({
          endpoint: `https://updates.push.services.mozilla.com/device${i}`,
          keys: validKeys
        });
      }
    } finally {
      spy.mockRestore();
    }
    const subs = getAllPushSubscriptions();
    expect(subs).toHaveLength(25);
    expect(subs.some((s) => s.endpoint.endsWith('/device26'))).toBe(true);
    expect(subs.some((s) => s.endpoint.endsWith('/device1'))).toBe(false);
    expect(hasPushSubscription('https://updates.push.services.mozilla.com/device26')).toBe(true);
  });

  it('subscribePush validates key material', () => {
    expect(checkPushKeys('short', 'short')).toEqual(
      expect.objectContaining({ ok: false })
    );
    const services = stubServices();
    const bad = services.subscribePush({
      endpoint: 'https://updates.push.services.mozilla.com/x',
      keys: { p256dh: 'bad', auth: 'bad' }
    });
    expect(bad).toMatchObject({ ok: false, status: 400 });
  });

  it('hasUsers is false on a fresh DB without user table', () => {
    expect(hasUsers()).toBe(false);
  });

  it('client IP validation rejects garbage', () => {
    expect(isValidIp('1.2.3.4')).toBe(true);
    expect(isValidIp('not-an-ip')).toBe(false);
    expect(isValidIp('')).toBe(false);
  });

  it('scan busy constant is stable for 409 mapping', () => {
    expect(SCAN_BUSY_ERROR).toBe('Scan already in progress');
  });
});
