const scanner = require('./scanner');
const notifications = require('../notifications');
const historyDb = require('../db/history');
const { getStatus } = require('../whatsapp/client');
const logger = require('../lib/logger');

async function runOnce() {
  const runAt = Date.now();
  let totalChecked = 0;
  let remindersSent = 0;
  let error = null;

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
    logger.error(`Scan run failed: ${err}`);
    error = err.message;
  }

  historyDb.logScan(runAt, totalChecked, remindersSent, error);
  return { runAt, totalChecked, remindersSent, error };
}

module.exports = { runOnce };
