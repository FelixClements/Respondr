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

export function get(chatId: string): ChatStateRow | null {
  const db = getDb();
  const row = db
    .prepare('SELECT chat_id AS id, name, state, until, created_at FROM chat_state WHERE chat_id = ?')
    .get(chatId) as ChatStateRow | undefined;
  return row || null;
}

export function isIgnored(chatId: string): boolean {
  const row = get(chatId);
  return !!row && row.state === 'ignored';
}

export function isDone(chatId: string): boolean {
  const row = get(chatId);
  return !!row && row.state === 'done';
}

export function list(): ChatStateRow[] {
  const db = getDb();
  return db
    .prepare('SELECT chat_id AS id, name, state, until, created_at FROM chat_state ORDER BY created_at DESC')
    .all() as ChatStateRow[];
}

export function listByState(state: string): ChatStateRow[] {
  const db = getDb();
  return db
    .prepare(
      'SELECT chat_id AS id, name, state, until, created_at FROM chat_state WHERE state = ? ORDER BY created_at DESC'
    )
    .all(state) as ChatStateRow[];
}

export function getStateById(): Record<string, string> {
  const rows = list();
  const map: Record<string, string> = {};
  for (const row of rows) {
    map[row.id] = row.state;
  }
  return map;
}

export function resetDoneIfNewMessage(chatId: string, lastMessageAt: number): boolean {
  const row = get(chatId);
  if (!row || row.state !== 'done') return false;

  const now = Date.now();
  if (row.until && now > row.until) {
    remove(chatId);
    return true;
  }

  if (lastMessageAt && lastMessageAt > row.created_at) {
    remove(chatId);
    return true;
  }

  return false;
}
