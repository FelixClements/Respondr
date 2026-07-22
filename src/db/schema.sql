CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT
);

CREATE TABLE IF NOT EXISTS ignored_chats (
  id TEXT PRIMARY KEY,
  name TEXT,
  ignored_at INTEGER
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
