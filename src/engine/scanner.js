const settingsDb = require('../db/settings');
const chatStateDb = require('../db/chatState');

function hoursSince(timestampMs, now = Date.now()) {
  return (now - timestampMs) / (1000 * 60 * 60);
}

async function scan(getRecentChats, now = Date.now()) {
  const chatLimit = parseInt(settingsDb.get('chat_limit'), 10) || 50;
  const thresholdHours = parseFloat(settingsDb.get('threshold_hours')) || 3;

  const chats = await getRecentChats(chatLimit);
  const ignoredIds = new Set(chatStateDb.listByState('ignored').map((chat) => chat.id));
  const doneRows = chatStateDb.listByState('done');
  const forgotten = [];

  for (const chat of chats) {
    if (chat.isGroup || chat.isArchived || chat.isMuted || ignoredIds.has(chat.id)) {
      continue;
    }

    const doneState = doneRows.find((row) => row.id === chat.id);
    if (doneState) {
      const lastMessageAt = chat.lastMessage?.timestampMs || 0;
      if (chatStateDb.resetDoneIfNewMessage(chat.id, lastMessageAt)) {
        // done state was cleared because of new activity; proceed to evaluate below
      } else {
        continue;
      }
    }

    if (!chat.lastMessage || chat.lastMessage.fromMe || chat.lastMessage.hasReactionFromMe) {
      continue;
    }

    const lastMessageAt = chat.lastMessage.timestampMs || chat.lastMessage.timestamp * 1000;
    const elapsedHours = hoursSince(lastMessageAt, now);

    if (elapsedHours > thresholdHours) {
      forgotten.push({
        id: chat.id,
        name: chat.name,
        lastMessageAt,
        hoursSince: elapsedHours
      });
    }
  }

  return { totalChecked: chats.length, forgotten };
}

async function run() {
  const { getRecentChats } = require('../whatsapp/client');
  return scan(getRecentChats);
}

module.exports = { scan, run, hoursSince };
