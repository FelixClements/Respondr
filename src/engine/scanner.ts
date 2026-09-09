import * as reminderDiscovery from '../domain/reminderDiscovery.js';
import * as settingsDb from '../db/settings.js';
import * as chatStateDb from '../db/chatState.js';
import type { ChatSource } from '../ports/chatSource.js';
import { getAppDeps } from '../whatsapp/create.js';

export async function scan(chatSource: ChatSource, now = Date.now()) {
  const chatLimit = settingsDb.parseChatLimit(undefined);
  const thresholdHours = settingsDb.parseThresholdHours(undefined);

  const chats = await chatSource.getRecentChats(chatLimit);
  const context = reminderDiscovery.buildDiscoveryContext(chatStateDb.list());
  const { totalChecked, forgotten, resetDoneIds } = reminderDiscovery.discoverReminders(
    chats,
    thresholdHours,
    context,
    now
  );

  for (const id of resetDoneIds) {
    chatStateDb.remove(id);
  }

  return { totalChecked, forgotten };
}

export async function run() {
  return scan(getAppDeps().chatSource);
}

export { hoursSince } from '../domain/reminderDiscovery.js';
