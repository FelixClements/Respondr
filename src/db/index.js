const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const DATA_DIR = process.env.DATA_DIR || './data';
const DB_PATH = process.env.DB_PATH || path.join(DATA_DIR, 'respondr.db');

const DEFAULTS = {
  interval_minutes: '30',
  chat_limit: '50',
  threshold_hours: '3'
};

let db = null;

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function getDb() {
  if (db) return db;
  ensureDataDir();
  db = new Database(DB_PATH);
  return db;
}

function closeDb() {
  if (db) {
    db.close();
    db = null;
  }
}

function initDb() {
  const schemaSql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  const database = getDb();
  database.exec(schemaSql);

  const insert = database.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)');
  for (const [key, value] of Object.entries(DEFAULTS)) {
    insert.run(key, value);
  }
}

module.exports = { getDb, closeDb, initDb, DEFAULTS };
