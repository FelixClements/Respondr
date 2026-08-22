import { seedNotificationSettingsFromEnv } from './settings.js';
import { ntfyChannel } from './channels/ntfyChannel.js';
import { gotifyChannel } from './channels/gotifyChannel.js';
import { webPushChannel, initWebPush } from './channels/webPushChannel.js';
import { createDispatcher } from './dispatcher.js';
import { buildReminderPayload, buildTestPayload } from './reminderContent.js';
import type { ForgottenChat, DeliveryReport } from './types.js';

const dispatcher = createDispatcher([ntfyChannel, gotifyChannel, webPushChannel]);

export function initNotifications(): void {
  seedNotificationSettingsFromEnv();
  initWebPush();
}

export async function sendReminder(chat: ForgottenChat): Promise<void> {
  const payload = buildReminderPayload(chat);
  await dispatcher.dispatchReminder(payload);
}

export async function sendTest(title: string, body: string): Promise<DeliveryReport> {
  return dispatcher.dispatch(buildTestPayload(title, body));
}

/** @deprecated use sendReminder */
export async function send(chat: ForgottenChat): Promise<void> {
  return sendReminder(chat);
}

export { buildReminderPayload as formatMessage };
export type { DeliveryReport };
