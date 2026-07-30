const webpush = require('web-push');
const pushSubscriptionsDb = require('../db/pushSubscriptions');
const logger = require('../lib/logger');

let isConfigured = false;

function init() {
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

async function sendToAll(payload) {
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
      logger.error(`Web Push failed for ${sub.endpoint}: ${err.message || err}`);
      if (err.statusCode === 410 || err.statusCode === 404) {
        pushSubscriptionsDb.removePushSubscription(sub.endpoint);
      }
    }
  }

  return { sent, failed };
}

module.exports = { init, sendToAll };
