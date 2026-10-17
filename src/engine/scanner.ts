import * as reminderDiscovery from '../domain/reminderDiscovery.js';
import * as settingsDb from '../db/settings.js';
import * as chatStateDb from '../db/chatState.js';
import * as whatsapp from '../whatsapp/session.js';

export async function run(now = Date.now()) {
  const chatLimit = settingsDb.parseChatLimit(undefined);
  const thresholdHours = settingsDb.parseThresholdHours(undefined);

  const chats = await whatsapp.getRecentChats(chatLimit);
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
