import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { closeDb, initDb } from '../../src/db/index.js';
import * as settingsDb from '../../src/db/settings.js';
import {
  getNotificationSettings,
  updateNotificationSettings,
  seedNotificationSettingsFromEnv
} from '../../src/notifications/settings.js';

describe('notification settings', () => {
  let dbPath = '';

  beforeEach(() => {
    dbPath = path.join(os.tmpdir(), `respondr-test-${Date.now()}.db`);
    process.env.DB_PATH = dbPath;
    initDb();
    settingsDb.seedDefaults();
  });

  afterEach(() => {
    closeDb();
    if (dbPath && fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
    delete process.env.DB_PATH;
  });

  it('returns typed defaults', () => {
    const settings = getNotificationSettings();
    expect(settings.ntfy.enabled).toBe(false);
    expect(settings.gotify.priority).toBe(5);
  });

  it('updates ntfy and gotify fields', () => {
    const updated = updateNotificationSettings({
      ntfy_enabled: true,
      ntfy_topic: 'alerts',
      gotify_enabled: true,
      gotify_url: 'https://gotify.example',
      gotify_token: 'secret'
    });
    expect(updated.ntfy.enabled).toBe(true);
    expect(updated.ntfy.topic).toBe('alerts');
    expect(updated.gotify.token).toBe('secret');
  });

  it('rejects a metadata Gotify URL', () => {
    expect(() =>
      updateNotificationSettings({
        gotify_url: 'http://169.254.169.254/'
      })
    ).toThrow(/not allowed/);
  });

  it('rejects a non-http NTFY server', () => {
    expect(() =>
      updateNotificationSettings({
        ntfy_server: 'gopher://ntfy.example'
      })
    ).toThrow(/http/);
  });

  it('allows an empty Gotify URL', () => {
    const updated = updateNotificationSettings({
      gotify_enabled: false,
      gotify_url: ''
    });
    expect(updated.gotify.url).toBe('');
  });

  it('seeds from environment when unset', () => {
    closeDb();
    const freshPath = path.join(os.tmpdir(), `respondr-seed-${Date.now()}.db`);
    process.env.DB_PATH = freshPath;
    initDb();
    settingsDb.seedDefaults();

    process.env.NTFY_TOPIC = 'env-topic';
    seedNotificationSettingsFromEnv();
    expect(getNotificationSettings().ntfy.topic).toBe('env-topic');
    delete process.env.NTFY_TOPIC;
    closeDb();
    if (fs.existsSync(freshPath)) fs.unlinkSync(freshPath);
    process.env.DB_PATH = dbPath;
    initDb();
  });
});
