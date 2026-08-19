import * as scanner from './scanner.js';
import * as notifications from '../notifications/index.js';
import * as historyDb from '../db/history.js';
import { getStatus } from '../whatsapp/client.js';
import * as logger from '../lib/logger.js';

export async function runOnce() {
  const runAt = Date.now();
  let totalChecked = 0;
  let remindersSent = 0;
  let error: string | null = null;

  logger.debug('runOnce started');

  try {
    if (!getStatus().isReady) {
      throw new Error('WhatsApp client is not ready');
    }

    const { totalChecked: checked, forgotten } = await scanner.run();
    totalChecked = checked;

    logger.debug(`runOnce found ${forgotten.length} forgotten chats out of ${checked} checked`);

    for (const chat of forgotten) {
      await notifications.send(chat);
      historyDb.logReminder(chat.id, chat.name, runAt);
      remindersSent++;
    }

    logger.info(`Scan complete: ${totalChecked} chats checked, ${remindersSent} reminders sent`);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error(`Scan run failed: ${message}`);
    error = message;
  }

  historyDb.logScan(runAt, totalChecked, remindersSent, error);
  return { runAt, totalChecked, remindersSent, error };
}
