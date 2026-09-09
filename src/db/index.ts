import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Database from 'better-sqlite3';
import * as logger from '../lib/logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const DATA_DIR = process.env.DATA_DIR || './data';

function getDbPath(): string {
  return process.env.DB_PATH || path.join(DATA_DIR, 'respondr.db');
}

let db: Database.Database | null = null;

function ensureDataDir(): void {
  const dirs = new Set<string>();
  dirs.add(process.env.DATA_DIR || './data');
  try {
    const dbPath = getDbPath();
    if (path.isAbsolute(dbPath) || dbPath.includes('/') || dbPath.includes(path.sep)) {
      dirs.add(path.dirname(path.resolve(dbPath)));
    }
  } catch {
    /* getDbPath never throws; keep DATA_DIR fallback */
  }
  for (const dir of dirs) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }
}

export function getDb(): Database.Database {
  if (db) return db;
  ensureDataDir();
  const dbPath = getDbPath();
  try {
    db = new Database(dbPath);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const uid = typeof process.getuid === 'function' ? process.getuid() : 'unknown';
    throw new Error(
      `Failed to open SQLite DB at ${dbPath} as uid ${uid}: ${message}. ` +
        `Check volume ownership (chown to the container user) and DATA_DIR/DB_PATH.`
    );
  }
  try {
    db.pragma('journal_mode = WAL');
    db.pragma('busy_timeout = 5000');
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error(`Failed to set SQLite pragmas: ${message}`);
  }
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
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    // Fresh DB before better-auth migrations: user table does not exist yet.
    if (/no such table/i.test(message)) return false;
    logger.error(`hasUsers check failed: ${message}`);
    throw err;
  }
}
