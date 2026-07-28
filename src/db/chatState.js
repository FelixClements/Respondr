const { getDb } = require('./index');

function add(chatId, name, state = 'ignored', until = null) {
  const db = getDb();
  if (state === 'done' && !until) {
    until = Date.now() + 30 * 24 * 60 * 60 * 1000; // 30-day safety net
  }
  db.prepare(
    'INSERT OR REPLACE INTO chat_state (chat_id, name, state, until, created_at) VALUES (?, ?, ?, ?, ?)'
  ).run(chatId, name, state, until, Date.now());
}

function remove(chatId) {
  const db = getDb();
  db.prepare('DELETE FROM chat_state WHERE chat_id = ?').run(chatId);
}

function get(chatId) {
  const db = getDb();
  return db.prepare('SELECT * FROM chat_state WHERE chat_id = ?').get(chatId) || null;
}

function isIgnored(chatId) {
  const row = get(chatId);
  return !!row && row.state === 'ignored';
}

function isDone(chatId) {
  const row = get(chatId);
  return !!row && row.state === 'done';
}

function list() {
  const db = getDb();
  return db
    .prepare('SELECT chat_id AS id, name, state, until, created_at FROM chat_state ORDER BY created_at DESC')
    .all();
}

function listByState(state) {
  const db = getDb();
  return db
    .prepare('SELECT chat_id AS id, name, state, until, created_at FROM chat_state WHERE state = ? ORDER BY created_at DESC')
    .all(state);
}

function getStateById() {
  const rows = list();
  const map = {};
  for (const row of rows) {
    map[row.id] = row.state;
  }
  return map;
}

function resetDoneIfNewMessage(chatId, lastMessageAt) {
  const row = get(chatId);
  if (!row || row.state !== 'done') return false;

  const now = Date.now();
  if (row.until && now > row.until) {
    remove(chatId);
    return true;
  }

  if (lastMessageAt && lastMessageAt > row.created_at) {
    remove(chatId);
    return true;
  }

  return false;
}

module.exports = {
  add,
  remove,
  get,
  isIgnored,
  isDone,
  list,
  listByState,
  getStateById,
  resetDoneIfNewMessage
};
