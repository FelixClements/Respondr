import type { ChatStateRow } from '../types.js';
import { getDb } from './index.js';

export function add(
  chatId: string,
  name: string,
  state: string = 'ignored',
  until: number | null = null
): void {
  const db = getDb();
  if (state === 'done' && !until) {
    until = Date.now() + 30 * 24 * 60 * 60 * 1000;
  }
  db.prepare(
    'INSERT OR REPLACE INTO chat_state (chat_id, name, state, until, created_at) VALUES (?, ?, ?, ?, ?)'
  ).run(chatId, name, state, until, Date.now());
}

export function remove(chatId: string): void {
  const db = getDb();
  db.prepare('DELETE FROM chat_state WHERE chat_id = ?').run(chatId);
}

export function list(): ChatStateRow[] {
  const db = getDb();
  return db
    .prepare('SELECT chat_id AS id, name, state, until, created_at FROM chat_state ORDER BY created_at DESC')
    .all() as ChatStateRow[];
}
