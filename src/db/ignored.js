const { getDb } = require('./index');

function add(chatId, name) {
  const db = getDb();
  db.prepare('INSERT OR REPLACE INTO ignored_chats (id, name, ignored_at) VALUES (?, ?, ?)').run(chatId, name, Date.now());
}

function remove(chatId) {
  const db = getDb();
  db.prepare('DELETE FROM ignored_chats WHERE id = ?').run(chatId);
}

function isIgnored(chatId) {
  const db = getDb();
  const row = db.prepare('SELECT 1 FROM ignored_chats WHERE id = ?').get(chatId);
  return !!row;
}

function list() {
  const db = getDb();
  return db.prepare('SELECT id, name, ignored_at FROM ignored_chats ORDER BY ignored_at DESC').all();
}

module.exports = { add, remove, isIgnored, list };
