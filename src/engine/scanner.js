const chatAnalysis = require('../domain/chatAnalysis');
const settingsDb = require('../db/settings');
const chatStateDb = require('../db/chatState');

async function scan(getRecentChats, now = Date.now()) {
  const chatLimit = parseInt(settingsDb.get('chat_limit'), 10) || 50;
  const thresholdHours = parseFloat(settingsDb.get('threshold_hours')) || 3;

  const chats = await getRecentChats(chatLimit);
  const ignoredIds = new Set(chatStateDb.listByState('ignored').map((chat) => chat.id));
  const doneRows = chatStateDb.listByState('done');
  const forgotten = [];

  for (const chat of chats) {
    if (ignoredIds.has(chat.id)) continue;

    const doneState = doneRows.find((row) => row.id === chat.id);
    if (doneState) {
      const lastMessageAt = chat.lastMessage?.timestampMs || 0;
      if (!chatStateDb.resetDoneIfNewMessage(chat.id, lastMessageAt)) {
        continue;
      }
    }

    if (chatAnalysis.isEligibleForReminder(chat, thresholdHours, now)) {
      const lastMessageAt = chat.lastMessage.timestampMs || chat.lastMessage.timestamp * 1000;
      forgotten.push({
        id: chat.id,
        name: chat.name,
        lastMessageAt,
        hoursSince: chatAnalysis.hoursSince(lastMessageAt, now)
      });
    }
  }

  return { totalChecked: chats.length, forgotten };
}

async function run() {
  const { getRecentChats } = require('../whatsapp/client');
  return scan(getRecentChats);
}

module.exports = { scan, run, hoursSince: chatAnalysis.hoursSince };
