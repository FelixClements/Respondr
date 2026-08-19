import type { ForgottenChat } from '../types.js';
import * as ntfy from './ntfy.js';
import * as gotify from './gotify.js';
import * as webPush from './web-push.js';
import { getNotificationConfig } from './config.js';

function formatMessage(chat: ForgottenChat): string {
  const hours = typeof chat.hoursSince === 'number' ? chat.hoursSince.toFixed(1) : 'several';
  return `${chat.name}: no reply for ${hours} hours`;
}

export async function send(chat: ForgottenChat): Promise<void> {
  const config = getNotificationConfig();
  const title = 'Respondr reminder';
  const message = formatMessage(chat);

  await Promise.all([
    config.ntfy.enabled
      ? ntfy.send({ title, message, priority: config.ntfy.priority })
      : Promise.resolve(),
    config.gotify.enabled
      ? gotify.send({ title, message, priority: config.gotify.priority })
      : Promise.resolve(),
    webPush.sendToAll({ title, body: message, url: '/', icon: '/icon-192.png' })
  ]);
}

export async function sendTest(title: string, message: string) {
  const config = getNotificationConfig();
  const results: Array<Record<string, unknown>> = [];

  if (config.ntfy.enabled) {
    try {
      await ntfy.send({ title, message, priority: config.ntfy.priority });
      results.push({ provider: 'ntfy', ok: true });
    } catch (err) {
      const error = err as Error;
      results.push({ provider: 'ntfy', ok: false, error: error.message });
    }
  }

  if (config.gotify.enabled) {
    try {
      await gotify.send({ title, message, priority: config.gotify.priority });
      results.push({ provider: 'gotify', ok: true });
    } catch (err) {
      const error = err as Error;
      results.push({ provider: 'gotify', ok: false, error: error.message });
    }
  }

  try {
    const pushResult = await webPush.sendToAll({
      title,
      body: message,
      url: '/',
      icon: '/icon-192.png'
    });
    if (pushResult.sent > 0 || pushResult.failed > 0) {
      results.push({ provider: 'web-push', ok: pushResult.failed === 0, ...pushResult });
    }
  } catch (err) {
    const error = err as Error;
    results.push({ provider: 'web-push', ok: false, error: error.message });
  }

  if (results.length === 0) {
    results.push({ provider: 'none', ok: false, error: 'No provider enabled' });
  }

  return results;
}

export { formatMessage };
