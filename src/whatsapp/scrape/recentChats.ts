// @ts-nocheck — executed in WhatsApp Web browser context via Puppeteer
/** Runs inside the WhatsApp Web page via Puppeteer page.evaluate(). */
export async function scrapeRecentChatsInBrowser(chatLimit: number) {
  const chatCollection = window.require('WAWebCollections').Chat;
  const all = chatCollection._models || [];
  const sorted = all.slice().sort((a: { t: number }, b: { t: number }) => (b.t || 0) - (a.t || 0));
  const result: Array<{
    id: string;
    name: string;
    isGroup: boolean;
    isArchived: boolean;
    isMuted: boolean;
    lastMessage: {
      fromMe: boolean;
      timestamp: number;
      timestampMs: number;
      hasReactionFromMe?: boolean;
    } | null;
  }> = [];

  let meId: string | null = null;
  try {
    const User = window.require('WAWebUserPrefs');
    const meWid = User.getMaybeMePnUser
      ? User.getMaybeMePnUser()
      : User.getMaybeMeUser
        ? User.getMaybeMeUser()
        : null;
    meId = meWid?._serialized || null;
  } catch {
    try {
      const Contact = window.require('WAWebCollections').Contact;
      if (Contact._models?.find) {
        const meContact = Contact._models.find((c: { isMe?: boolean }) => c.isMe === true);
        meId = meContact?.id?._serialized || null;
      }
    } catch {
      /* ignore */
    }
  }

  function hasReactionFromMe(msg: {
    reactions?: {
      reactionByMe?: boolean;
      _models?: Array<{ reactionByMe?: boolean; hasReactionByMe?: boolean; senders?: unknown[] }>;
      models?: unknown[];
    };
  }): boolean {
    if (!msg?.reactions) return false;
    const r = msg.reactions;
    if (r.reactionByMe) return true;
    const models = (r._models || r.models || []) as Array<{
      reactionByMe?: boolean;
      hasReactionByMe?: boolean;
      senders?: Array<{ isMe?: boolean; id?: { _serialized?: string } }>;
    }>;
    if (models.length) {
      return models.some((rx) => {
        if (rx.reactionByMe) return true;
        if (rx.hasReactionByMe === true) return true;
        const senders = rx.senders;
        if (senders?.length) {
          return senders.some(
            (s) => s && (s.isMe === true || (meId && s.id?._serialized === meId))
          );
        }
        return false;
      });
    }
    return false;
  }

  function getDisplayName(chat: {
    formattedTitle?: string;
    contact?: {
      name?: string;
      pushname?: string;
      verifiedName?: string;
      shortName?: string;
    };
  }): string {
    const isNumberLike = (s: string) => typeof s === 'string' && /^[+\d][\d\s\-+()]*$/.test(s);
    const title = chat.formattedTitle;
    if (title && !isNumberLike(title)) return title;
    const contact = chat.contact;
    if (contact) {
      const candidates = [contact.name, contact.pushname, contact.verifiedName, contact.shortName];
      for (const c of candidates) {
        if (c && !isNumberLike(c)) return c;
      }
    }
    return title || 'Unknown';
  }

  for (const chat of sorted) {
    if (result.length >= chatLimit) break;

    const serialized = chat.serialize ? chat.serialize() : {};
    const isGroup = !!chat.groupMetadata;
    const isArchived = Boolean(serialized.archive);
    const isMuted = chat.mute && chat.mute.expiration !== 0;

    if (isGroup || isArchived || isMuted) continue;

    const targetTs = chat.t || 0;
    let lastMessage: (typeof result)[number]['lastMessage'] = null;
    const msgs = chat.msgs ? chat.msgs._models : [];

    if (msgs.length) {
      const match = msgs.find((m: { t: number }) => m.t === targetTs);
      const last = match || msgs.reduce((a: { t: number }, b: { t: number }) => (b.t > a.t ? b : a), msgs[0]);
      if (last) {
        lastMessage = {
          fromMe: last.id.fromMe,
          timestamp: last.t,
          timestampMs: last.t * 1000,
          hasReactionFromMe: hasReactionFromMe(last)
        };
      }
    }

    if (!lastMessage && chat.lastReceivedKey) {
      try {
        const msg = window.require('WAWebCollections').Msg.get(chat.lastReceivedKey.toString());
        if (msg) {
          lastMessage = {
            fromMe: msg.id.fromMe,
            timestamp: msg.t,
            timestampMs: msg.t * 1000,
            hasReactionFromMe: hasReactionFromMe(msg)
          };
        }
      } catch {
        /* ignore */
      }
    }

    result.push({
      id: chat.id._serialized,
      name: getDisplayName(chat),
      isGroup,
      isArchived,
      isMuted,
      lastMessage
    });
  }

  return result;
}
