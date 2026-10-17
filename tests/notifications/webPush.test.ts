import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { closeDb, initDb } from '../../src/db/index.js';
import { addPushSubscription, getAllPushSubscriptions } from '../../src/db/pushSubscriptions.js';

const sendNotification = vi.fn();

vi.mock('web-push', () => ({
  default: {
    setVapidDetails: vi.fn(),
    sendNotification: (...args: unknown[]) => sendNotification(...args)
  }
}));

const { initWebPush, sendPush } = await import('../../src/notifications/webPush.js');

const payload = { title: 'T', body: 'B', url: '/', icon: '/icon.png' };
const keys = { p256dh: 'A'.repeat(87), auth: 'B'.repeat(22) };
const endpoint = (n: number) => `https://updates.push.services.mozilla.com/device${n}`;

describe('sendPush', () => {
  let dbPath = '';

  beforeEach(() => {
    dbPath = path.join(os.tmpdir(), `respondr-webpush-${Date.now()}-${Math.random()}.db`);
    process.env.DB_PATH = dbPath;
    process.env.VAPID_PUBLIC_KEY = 'pub';
    process.env.VAPID_PRIVATE_KEY = 'priv';
    process.env.VAPID_SUBJECT = 'mailto:test@example.com';
    initDb();
    initWebPush();
    sendNotification.mockReset();
  });

  afterEach(() => {
    closeDb();
    if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
    delete process.env.DB_PATH;
    delete process.env.VAPID_PUBLIC_KEY;
    delete process.env.VAPID_PRIVATE_KEY;
    delete process.env.VAPID_SUBJECT;
  });

  it('skips when no device is subscribed', async () => {
    expect(await sendPush(payload)).toMatchObject({ status: 'skipped' });
    expect(sendNotification).not.toHaveBeenCalled();
  });

  it('skips when VAPID keys are missing', async () => {
    delete process.env.VAPID_PUBLIC_KEY;
    initWebPush();
    addPushSubscription({ endpoint: endpoint(1), keys });
    expect(await sendPush(payload)).toMatchObject({ status: 'skipped' });
  });

  it('sends to every subscription', async () => {
    addPushSubscription({ endpoint: endpoint(1), keys });
    addPushSubscription({ endpoint: endpoint(2), keys });
    sendNotification.mockResolvedValue({});
    expect(await sendPush(payload)).toEqual({
      status: 'sent',
      sent: 2,
      failed: 0,
      error: undefined
    });
    expect(JSON.parse(sendNotification.mock.calls[0][1])).toEqual(payload);
  });

  it('reports failures and prunes subscriptions the push service says are gone', async () => {
    addPushSubscription({ endpoint: endpoint(1), keys });
    addPushSubscription({ endpoint: endpoint(2), keys });
    sendNotification.mockImplementation(async (sub: { endpoint: string }) => {
      if (sub.endpoint === endpoint(1)) throw Object.assign(new Error('gone'), { statusCode: 410 });
      return {};
    });
    expect(await sendPush(payload)).toMatchObject({ status: 'failed', sent: 1, failed: 1 });
    expect(getAllPushSubscriptions().map((s) => s.endpoint)).toEqual([endpoint(2)]);
  });
});
