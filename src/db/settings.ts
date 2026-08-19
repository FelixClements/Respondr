import type { SettingsMap } from '../types.js';
import { getDb } from './index.js';

export const DEFAULTS: SettingsMap = {
  interval_minutes: '30',
  chat_limit: '50',
  threshold_hours: '3',
  log_level: 'info'
};

export function get(key: string): string | undefined {
  const db = getDb();
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as { value: string } | undefined;
  return row ? row.value : DEFAULTS[key as keyof typeof DEFAULTS];
}

export function set(key: string, value: string | number): void {
  const db = getDb();
  db.prepare(
    'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value'
  ).run(key, String(value));
}

export function has(key: string): boolean {
  const db = getDb();
  const row = db.prepare('SELECT 1 FROM settings WHERE key = ?').get(key);
  return !!row;
}

export function getAll(): SettingsMap {
  const db = getDb();
  const rows = db.prepare('SELECT key, value FROM settings').all() as { key: string; value: string }[];
  const result: SettingsMap = { ...DEFAULTS };
  for (const row of rows) {
    result[row.key] = row.value;
  }
  return result;
}

export function seedDefaults(): void {
  const db = getDb();
  const insert = db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)');
  for (const [key, value] of Object.entries(DEFAULTS)) {
    insert.run(key, String(value));
  }
}
