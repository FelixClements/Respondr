import webpush from 'web-push';
import * as pushSubscriptionsDb from '../db/pushSubscriptions.js';
import * as logger from '../lib/logger.js';

let isConfigured = false;

export function init(): void {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;

  if (publicKey && privateKey && subject) {
    webpush.setVapidDetails(subject, publicKey, privateKey);
    isConfigured = true;
    logger.info('Web Push configured with VAPID.');
  } else {
    logger.debug('VAPID keys not configured; Web Push disabled.');
  }
}

export async function sendToAll(payload: Record<string, unknown>) {
  if (!isConfigured) {
    return { sent: 0, failed: 0, error: 'VAPID not configured' };
  }

  const subs = pushSubscriptionsDb.getAllPushSubscriptions();
  let sent = 0;
  let failed = 0;

  for (const sub of subs) {
    const pushSub = {
      endpoint: sub.endpoint,
      keys: {
        p256dh: sub.p256dh,
        auth: sub.auth
      }
    };

    try {
      await webpush.sendNotification(pushSub, JSON.stringify(payload));
      sent += 1;
    } catch (err) {
      failed += 1;
      const error = err as { message?: string; statusCode?: number };
      logger.error(`Web Push failed for ${sub.endpoint}: ${error.message || err}`);
      if (error.statusCode === 410 || error.statusCode === 404) {
        pushSubscriptionsDb.removePushSubscription(sub.endpoint);
      }
    }
  }

  return { sent, failed };
}
