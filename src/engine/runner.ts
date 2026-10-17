import * as scanner from './scanner.js';
import * as notifications from '../notifications/index.js';
import * as historyDb from '../db/history.js';
import * as whatsapp from '../whatsapp/session.js';
import { createGuard } from '../lib/guard.js';
import * as logger from '../lib/logger.js';

const scanGuard = createGuard();
export const SCAN_BUSY_ERROR = 'Scan already in progress';

export function resetScanForTests(): void {
  scanGuard.resetForTests();
}

export async function runOnce() {
  const runAt = Date.now();
  if (!scanGuard.tryAcquire()) {
    logger.warn('Scan already in progress, skipping concurrent run');
    return { runAt, totalChecked: 0, remindersSent: 0, error: SCAN_BUSY_ERROR, busy: true as const };
  }

  let totalChecked = 0;
  let remindersSent = 0;
  let error: string | null = null;

  logger.debug('runOnce started');

  try {
    if (!whatsapp.getStatus().isReady) {
      throw new Error('WhatsApp client is not ready');
    }

    await whatsapp.keepAlive();

    const { totalChecked: checked, forgotten } = await scanner.run();
    totalChecked = checked;

    logger.debug(`runOnce found ${forgotten.length} forgotten chats out of ${checked} checked`);

    for (const chat of forgotten) {
      await notifications.sendReminder(chat);
      historyDb.logReminder(chat.id, chat.name, runAt);
      remindersSent++;
    }

    logger.info(`Scan complete: ${totalChecked} chats checked, ${remindersSent} reminders sent`);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error(`Scan run failed: ${message}`);
    error = message;
  } finally {
    scanGuard.release();
  }

  historyDb.logScan(runAt, totalChecked, remindersSent, error);
  historyDb.pruneHistory(runAt);
  return { runAt, totalChecked, remindersSent, error };
}
