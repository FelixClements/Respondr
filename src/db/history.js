const { getDb } = require('./index');

function logReminder(chatId, chatName, sentAt = Date.now()) {
  const db = getDb();
  db.prepare('INSERT INTO reminders (chat_id, chat_name, sent_at) VALUES (?, ?, ?)').run(chatId, chatName, sentAt);
}

function logScan(runAt, chatsChecked, remindersSent, error = null) {
  const db = getDb();
  db.prepare('INSERT INTO scan_logs (run_at, chats_checked, reminders_sent, error) VALUES (?, ?, ?, ?)').run(runAt, chatsChecked, remindersSent, error);
}

function getRecentReminders(limit = 50) {
  const db = getDb();
  return db.prepare('SELECT * FROM reminders ORDER BY sent_at DESC LIMIT ?').all(limit);
}

function getRecentScans(limit = 50) {
  const db = getDb();
  return db.prepare('SELECT * FROM scan_logs ORDER BY run_at DESC LIMIT ?').all(limit);
}

module.exports = { logReminder, logScan, getRecentReminders, getRecentScans };
