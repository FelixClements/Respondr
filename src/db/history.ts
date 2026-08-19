import type { ReminderRow, ScanLogRow } from '../types.js';
import { getDb } from './index.js';

export function logReminder(chatId: string, chatName: string, sentAt = Date.now()): void {
  const db = getDb();
  db.prepare('INSERT INTO reminders (chat_id, chat_name, sent_at) VALUES (?, ?, ?)').run(
    chatId,
    chatName,
    sentAt
  );
}

export function logScan(
  runAt: number,
  chatsChecked: number,
  remindersSent: number,
  error: string | null = null
): void {
  const db = getDb();
  db.prepare(
    'INSERT INTO scan_logs (run_at, chats_checked, reminders_sent, error) VALUES (?, ?, ?, ?)'
  ).run(runAt, chatsChecked, remindersSent, error);
}

export function getRecentReminders(limit = 50): ReminderRow[] {
  const db = getDb();
  return db.prepare('SELECT * FROM reminders ORDER BY sent_at DESC LIMIT ?').all(limit) as ReminderRow[];
}

export function getRecentScans(limit = 50): ScanLogRow[] {
  const db = getDb();
  return db.prepare('SELECT * FROM scan_logs ORDER BY run_at DESC LIMIT ?').all(limit) as ScanLogRow[];
}
