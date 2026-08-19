import * as chatAnalysis from '../domain/chatAnalysis.js';
import * as settingsDb from '../db/settings.js';
import * as chatStateDb from '../db/chatState.js';
import type { ForgottenChat, RawChat } from '../types.js';

export async function scan(
  getRecentChats: (limit: number) => Promise<RawChat[]>,
  now = Date.now()
) {
  const chatLimit = parseInt(settingsDb.get('chat_limit') || '50', 10) || 50;
  const thresholdHours = parseFloat(settingsDb.get('threshold_hours') || '3') || 3;

  const chats = await getRecentChats(chatLimit);
  const ignoredIds = new Set(chatStateDb.listByState('ignored').map((chat) => chat.id));
  const doneRows = chatStateDb.listByState('done');
  const forgotten: ForgottenChat[] = [];

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
      const lastMessageAt =
        chat.lastMessage!.timestampMs || chat.lastMessage!.timestamp * 1000;
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

export async function run() {
  const { getRecentChats } = await import('../whatsapp/client.js');
  return scan(getRecentChats);
}

export { hoursSince } from '../domain/chatAnalysis.js';
