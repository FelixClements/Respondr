const { getDb } = require('./index');

const DEFAULTS = {
  interval_minutes: '30',
  chat_limit: '50',
  threshold_hours: '3',
  log_level: 'info'
};

function get(key) {
  const db = getDb();
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
  return row ? row.value : DEFAULTS[key];
}

function set(key, value) {
  const db = getDb();
  db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value').run(key, String(value));
}

function has(key) {
  const db = getDb();
  const row = db.prepare('SELECT 1 FROM settings WHERE key = ?').get(key);
  return !!row;
}

function getAll() {
  const db = getDb();
  const rows = db.prepare('SELECT key, value FROM settings').all();
  const result = { ...DEFAULTS };
  for (const row of rows) {
    result[row.key] = row.value;
  }
  return result;
}

function seedDefaults() {
  const db = getDb();
  const insert = db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)');
  for (const [key, value] of Object.entries(DEFAULTS)) {
    insert.run(key, String(value));
  }
}

module.exports = { get, set, has, getAll, DEFAULTS, seedDefaults };
