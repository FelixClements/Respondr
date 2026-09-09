import webpush from 'web-push';
import * as pushSubscriptionsDb from '../../db/pushSubscriptions.js';
import * as logger from '../../lib/logger.js';
import type { NotificationChannel, NotificationPayload, ChannelOutcome } from '../types.js';

let isConfigured = false;

export function initWebPush(): void {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;

  if (publicKey && privateKey && subject) {
    webpush.setVapidDetails(subject, publicKey, privateKey);
    isConfigured = true;
    logger.info('Web Push configured with VAPID.');
  } else {
    isConfigured = false;
    logger.debug('VAPID keys not configured; Web Push disabled.');
  }
}

export function isWebPushConfigured(): boolean {
  return isConfigured;
}

export function getVapidPublicKey(): string | null {
  return process.env.VAPID_PUBLIC_KEY || null;
}

function pruneIfGone(endpoint: string, statusCode: number | undefined): void {
  if (statusCode !== 410 && statusCode !== 404) return;
  try {
    pushSubscriptionsDb.removePushSubscription(endpoint);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error(`Failed to prune gone push subscription ${endpoint}: ${message}`);
  }
}

function partitionSettled(results: PromiseSettledResult<unknown>[]): { sent: number; failed: number } {
  let sent = 0;
  let failed = 0;
  for (const res of results) {
    if (res.status === 'fulfilled') sent += 1;
    else failed += 1;
  }
  return { sent, failed };
}

export const webPushChannel: NotificationChannel = {
  id: 'web-push',

  isAvailable() {
    if (!isConfigured) return false;
    return pushSubscriptionsDb.getAllPushSubscriptions().length > 0;
  },

  async send(payload: NotificationPayload): Promise<ChannelOutcome> {
    if (!isConfigured) {
      return { channel: 'web-push', status: 'skipped' };
    }

    const subs = pushSubscriptionsDb.getAllPushSubscriptions();
    if (subs.length === 0) {
      return { channel: 'web-push', status: 'skipped' };
    }

    const body = JSON.stringify(payload);

    const results = await Promise.allSettled(
      subs.map(async (sub) => {
        const pushSub = {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth }
        };
        try {
          await webpush.sendNotification(pushSub, body);
          return { ok: true as const, endpoint: sub.endpoint };
        } catch (err) {
          const error = err as { message?: string; statusCode?: number };
          logger.error(`Web Push failed for ${sub.endpoint}: ${error.message || err}`);
          pruneIfGone(sub.endpoint, error.statusCode);
          throw err;
        }
      })
    );

    const { sent, failed } = partitionSettled(results);

    return {
      channel: 'web-push',
      status: failed === 0 ? 'sent' : 'failed',
      sent,
      failed,
      error: failed > 0 ? `${failed} subscription(s) failed` : undefined
    };
  }
};
