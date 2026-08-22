import type { ForgottenChat } from '../types.js';
import type { NotificationPayload } from './types.js';

export function buildReminderPayload(chat: ForgottenChat): NotificationPayload {
  const hours =
    typeof chat.hoursSince === 'number' ? chat.hoursSince.toFixed(1) : 'several';
  return {
    title: 'Respondr reminder',
    body: `${chat.name}: no reply for ${hours} hours`,
    url: '/',
    icon: '/icon-192.png'
  };
}

export function buildTestPayload(title: string, body: string): NotificationPayload {
  return {
    title,
    body,
    url: '/',
    icon: '/icon-192.png'
  };
}
