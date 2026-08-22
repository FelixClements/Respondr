import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Database from 'better-sqlite3';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const DATA_DIR = process.env.DATA_DIR || './data';

function getDbPath(): string {
  return process.env.DB_PATH || path.join(DATA_DIR, 'respondr.db');
}

let db: Database.Database | null = null;

function ensureDataDir(): void {
  const dataDir = process.env.DATA_DIR || './data';
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
}

export function getDb(): Database.Database {
  if (db) return db;
  ensureDataDir();
  db = new Database(getDbPath());
  return db;
}

export function closeDb(): void {
  if (db) {
    db.close();
    db = null;
  }
}

export function initDb(): void {
  const schemaSql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  const database = getDb();
  database.exec(schemaSql);
}

export function hasUsers(): boolean {
  try {
    const row = getDb().prepare('SELECT COUNT(*) as count FROM user').get() as { count: number };
    return row.count > 0;
  } catch {
    return false;
  }
}
