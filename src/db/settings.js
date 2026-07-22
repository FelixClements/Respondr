const { getDb, DEFAULTS } = require('./index');

function get(key) {
  const db = getDb();
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
  return row ? row.value : DEFAULTS[key];
}

function set(key, value) {
  const db = getDb();
  db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value').run(key, String(value));
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

module.exports = { get, set, getAll, DEFAULTS };
