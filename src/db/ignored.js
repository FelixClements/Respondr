const chatState = require('./chatState');

function add(chatId, name) {
  chatState.add(chatId, name, 'ignored');
}

function remove(chatId) {
  chatState.remove(chatId);
}

function isIgnored(chatId) {
  return chatState.isIgnored(chatId);
}

function list() {
  return chatState.listByState('ignored').map((row) => ({
    id: row.id,
    name: row.name,
    ignored_at: row.created_at
  }));
}

module.exports = { add, remove, isIgnored, list };
