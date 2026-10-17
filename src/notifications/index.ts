import * as logger from '../lib/logger.js';
import type { ForgottenChat } from '../types.js';
import { initWebPush, sendPush } from './webPush.js';
import { buildReminderPayload } from './reminderContent.js';

export function initNotifications(): void {
  initWebPush();
}

export async function sendReminder(chat: ForgottenChat): Promise<void> {
  const result = await sendPush(buildReminderPayload(chat));
  if (result.status === 'failed') {
    logger.error(`Web Push reminder failed: ${result.error || 'unknown'}`);
  }
}
