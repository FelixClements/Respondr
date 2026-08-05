function hoursSince(timestampMs, now = Date.now()) {
  if (!timestampMs || !now) return null;
  return Number(((now - timestampMs) / (1000 * 60 * 60)).toFixed(1));
}

function isEligibleForReminder(chat, thresholdHours, now = Date.now()) {
  if (!chat || chat.isGroup || chat.isArchived || chat.isMuted) return false;
  if (!chat.lastMessage) return false;
  if (chat.lastMessage.fromMe || chat.lastMessage.hasReactionFromMe) return false;

  const lastTs = chat.lastMessage.timestampMs || chat.lastMessage.timestamp * 1000;
  if (!lastTs || !Number.isFinite(lastTs)) return false;

  return (now - lastTs) / (1000 * 60 * 60) > thresholdHours;
}

function enrichChat(chat, state, thresholdHours, now = Date.now()) {
  const lastTs = chat.lastMessage?.timestampMs || chat.lastMessage?.timestamp * 1000 || 0;
  const elapsed = lastTs ? hoursSince(lastTs, now) : null;

  return {
    ...chat,
    hoursSince: elapsed,
    needsReply: isEligibleForReminder(chat, thresholdHours, now),
    state: state || null
  };
}

function statsForChats(chats, thresholdHours, now = Date.now()) {
  return {
    total: chats.length,
    urgent: chats.filter((chat) => isEligibleForReminder(chat, thresholdHours, now)).length
  };
}

module.exports = { hoursSince, isEligibleForReminder, enrichChat, statsForChats };
