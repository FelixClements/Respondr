import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { closeDb, initDb } from '../../src/db/index.js';
import * as settingsDb from '../../src/db/settings.js';
import { buildApiApp } from '../../src/server/api.js';
import type { NotificationSettingsDto } from '../../src/notifications/settings.js';

vi.mock('../../src/whatsapp/create.js', () => ({
  getAppDeps: () => ({ chatSource: {}, whatsapp: {} })
}));

function put(app: ReturnType<typeof buildApiApp>, body: unknown) {
  return app.request('/notifications', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
}

async function get(app: ReturnType<typeof buildApiApp>): Promise<NotificationSettingsDto> {
  return (await app.request('/notifications')).json();
}

describe('PUT /notifications', () => {
  let dbPath = '';

  beforeEach(() => {
    dbPath = path.join(os.tmpdir(), `respondr-notif-api-${Date.now()}-${Math.random()}.db`);
    process.env.DB_PATH = dbPath;
    initDb();
    settingsDb.seedDefaults();
  });

  afterEach(() => {
    closeDb();
    if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
    delete process.env.DB_PATH;
  });

  it('saves the same shape GET returns, as the settings page sends it', async () => {
    const app = buildApiApp();
    const settings = await get(app);
    settings.ntfy = { enabled: true, server: 'https://ntfy.example', topic: 'alerts', priority: 4 };
    settings.gotify = { enabled: true, url: 'https://gotify.example', token: 'secret', priority: 7 };

    const res = await put(app, settings);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(settings);
    expect(await get(app)).toEqual(settings);
  });

  it('accepts priorities sent as strings by number inputs', async () => {
    const app = buildApiApp();
    const res = await put(app, { ntfy: { priority: '5' }, gotify: { priority: '0' } });
    expect(res.status).toBe(200);
    const saved = await get(app);
    expect(saved.ntfy.priority).toBe(5);
    expect(saved.gotify.priority).toBe(0);
  });

  it('saves nothing when any field is invalid', async () => {
    const app = buildApiApp();
    const before = await get(app);

    const res = await put(app, {
      ntfy: { enabled: true, server: 'https://ntfy.example', topic: '../evil' },
      gotify: { url: 'https://gotify.example' }
    });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/topic/i);
    expect(await get(app)).toEqual(before);
  });

  it.each([
    ['null body', null],
    ['array body', []],
    ['non-object section', { ntfy: 'on' }],
    ['non-boolean enabled', { gotify: { enabled: 'true' } }]
  ])('rejects a malformed request (%s)', async (_label, body) => {
    const app = buildApiApp();
    const before = await get(app);
    const res = await put(app, body);
    expect(res.status).toBe(400);
    expect(await get(app)).toEqual(before);
  });
});
