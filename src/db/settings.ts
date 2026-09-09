import type { SettingsMap } from '../types.js';
import { getDb } from './index.js';

export const DEFAULTS: SettingsMap = {
  interval_minutes: '30',
  chat_limit: '50',
  threshold_hours: '3',
  log_level: 'info'
};

// Canonical core-setting keys. filterCoreSettings in appServices must use
// this list so adding a core setting touches one place, not three.
export const CORE_SETTING_KEYS = [
  'interval_minutes',
  'chat_limit',
  'threshold_hours',
  'log_level'
] as const;

export type CoreSettingKey = (typeof CORE_SETTING_KEYS)[number];

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

// Centralized numeric parsing policy (single place for fallbacks).
export function parseIntervalMinutes(raw: unknown): number {
  const parsed = parseInt(String(raw ?? get('interval_minutes') ?? '30'), 10);
  return Number.isFinite(parsed) ? parsed : 30;
}

export function parseChatLimit(raw: unknown): number {
  const parsed = parseInt(String(raw ?? get('chat_limit') ?? '50'), 10);
  return Number.isFinite(parsed) ? parsed : 50;
}

export function parseThresholdHours(raw: unknown): number {
  const parsed = parseFloat(String(raw ?? get('threshold_hours') ?? '3'));
  return Number.isFinite(parsed) ? parsed : 3;
}
