CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT
);

CREATE TABLE IF NOT EXISTS chat_state (
  chat_id TEXT PRIMARY KEY,
  name TEXT,
  state TEXT NOT NULL DEFAULT 'ignored',
  until INTEGER,
  created_at INTEGER
);

CREATE TABLE IF NOT EXISTS reminders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  chat_id TEXT,
  chat_name TEXT,
  sent_at INTEGER
);

CREATE TABLE IF NOT EXISTS scan_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  run_at INTEGER,
  chats_checked INTEGER,
  reminders_sent INTEGER,
  error TEXT
);

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at INTEGER
);

-- Tables from earlier versions that nothing reads any more.
DROP TABLE IF EXISTS ignored_chats;
DROP TABLE IF EXISTS scan_locks;

-- NTFY and Gotify were removed; drop their settings (including the Gotify token).
DELETE FROM settings WHERE key LIKE 'ntfy\_%' ESCAPE '\' OR key LIKE 'gotify\_%' ESCAPE '\';
