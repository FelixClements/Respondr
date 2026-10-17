import type { ForgottenChat } from '../types.js';
import type { NotificationPayload } from './types.js';

export function buildReminderPayload(chat: ForgottenChat): NotificationPayload {
  const hours =
    typeof chat.hoursSince === 'number' ? chat.hoursSince.toFixed(1) : 'several';
  return {
    title: 'Respondr reminder',
    body: `${chat.name}: no reply for ${hours} hours`,
    url: '/',
    icon: '/icon-192.png',
    // One tag per chat: a repeat reminder replaces that chat's previous one
    // instead of hiding reminders for other chats.
    tag: `respondr-reminder-${chat.id}`
  };
}

export function buildTestPayload(title: string, body: string): NotificationPayload {
  return {
    title,
    body,
    url: '/',
    icon: '/icon-192.png',
    tag: 'respondr-test'
  };
}
