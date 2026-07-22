const settingsDb = require('../db/settings');
const ignoredDb = require('../db/ignored');

function hoursSince(timestampMs, now = Date.now()) {
  return (now - timestampMs) / (1000 * 60 * 60);
}

async function scan(getRecentChats, now = Date.now()) {
  const chatLimit = parseInt(settingsDb.get('chat_limit'), 10) || 50;
  const thresholdHours = parseFloat(settingsDb.get('threshold_hours')) || 3;

  const chats = await getRecentChats(chatLimit);
  const ignoredIds = new Set(ignoredDb.list().map((chat) => chat.id));
  const forgotten = [];

  for (const chat of chats) {
    if (chat.isGroup || chat.isArchived || chat.isMuted || ignoredIds.has(chat.id)) {
      continue;
    }

    if (!chat.lastMessage || chat.lastMessage.fromMe) {
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

  return forgotten;
}

async function run() {
  const { getRecentChats } = require('../whatsapp/client');
  return scan(getRecentChats);
}

module.exports = { scan, run, hoursSince };
