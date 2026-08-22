import * as reminderDiscovery from '../domain/reminderDiscovery.js';
import * as settingsDb from '../db/settings.js';
import * as chatStateDb from '../db/chatState.js';
import type { ChatSource } from '../ports/chatSource.js';
import { getAppDeps } from '../whatsapp/create.js';

export async function scan(chatSource: ChatSource, now = Date.now()) {
  const chatLimit = parseInt(settingsDb.get('chat_limit') || '50', 10) || 50;
  const thresholdHours = parseFloat(settingsDb.get('threshold_hours') || '3') || 3;

  const chats = await chatSource.getRecentChats(chatLimit);
  const context = reminderDiscovery.buildDiscoveryContext(chatStateDb.list());
  const { totalChecked, forgotten } = reminderDiscovery.discoverReminders(
    chats,
    thresholdHours,
    context,
    now
  );

  return { totalChecked, forgotten };
}

export async function run() {
  return scan(getAppDeps().chatSource);
}

export { hoursSince } from '../domain/reminderDiscovery.js';
