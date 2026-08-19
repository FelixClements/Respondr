import wweb from 'whatsapp-web.js';
import QRCode from 'qrcode';
import fs from 'node:fs';
import path from 'node:path';
import * as logger from '../lib/logger.js';
import type { RawChat, WhatsAppHealth, WhatsAppStatus } from '../types.js';

const { Client, LocalAuth } = wweb;

const AUTH_DIR = process.env.AUTH_DIR || './.wwebjs_auth';
const DEFAULT_CHROMIUM_PATH = '/Applications/Chromium.app/Contents/MacOS/Chromium';
const PUPPETEER_EXECUTABLE_PATH =
  process.env.PUPPETEER_EXECUTABLE_PATH ||
  (fs.existsSync(DEFAULT_CHROMIUM_PATH) ? DEFAULT_CHROMIUM_PATH : undefined);
const PUPPETEER_ARGS = process.env.PUPPETEER_ARGS
  ? process.env.PUPPETEER_ARGS.split(' ')
  : [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--no-first-run',
      '--no-default-browser-check',
      '--window-size=1280,720'
    ];

let qrDataUrl: string | null = null;
let status = 'initializing';
let isReady = false;
let launchError: string | null = null;

function clearProfileLocks(): void {
  const sessionDir = path.join(AUTH_DIR, 'session');
  try {
    if (!fs.existsSync(sessionDir)) return;
    const files = fs.readdirSync(sessionDir);
    for (const file of files) {
      if (file.startsWith('Singleton')) {
        fs.unlinkSync(path.join(sessionDir, file));
        logger.debug(`Cleared stale profile lock: ${file}`);
      }
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.debug('Could not clear profile locks:', message);
  }
}

const client = new Client({
  authStrategy: new LocalAuth({ dataPath: AUTH_DIR }),
  puppeteer: {
    headless: true,
    executablePath: PUPPETEER_EXECUTABLE_PATH,
    args: PUPPETEER_ARGS
  }
});

client.on('qr', async (qr: string) => {
  status = 'awaiting_qr';
  logger.info('WhatsApp QR code received.');
  try {
    qrDataUrl = await QRCode.toDataURL(qr);
    logger.info('QR code generated; scan it to link WhatsApp.');
  } catch (err) {
    logger.error('Failed to generate QR code:', err);
  }
});

client.on('authenticated', () => {
  status = 'authenticated';
  logger.info('WhatsApp authenticated.');
});

client.on('auth_failure', (msg: string) => {
  status = 'auth_failure';
  logger.error('WhatsApp authentication failure:', msg);
});

client.on('ready', () => {
  isReady = true;
  status = 'ready';
  qrDataUrl = null;
  logger.info('WhatsApp client is ready.');
});

client.on('disconnected', (reason: string) => {
  isReady = false;
  status = 'disconnected';
  logger.warn('WhatsApp client disconnected:', reason);
});

client.on('loading_screen', (percent: number, message: string) => {
  logger.debug(`WhatsApp loading screen: ${percent}% ${message}`);
});

client.on('change_state', (state: string) => {
  logger.debug(`WhatsApp state changed: ${state}`);
});

client.on('change_battery', (batteryInfo: unknown) => {
  logger.debug(`WhatsApp battery info: ${JSON.stringify(batteryInfo)}`);
});

export async function startClient(): Promise<void> {
  logger.info('Initializing WhatsApp client...');
  clearProfileLocks();
  logger.debug(
    `WhatsApp client config: executablePath=${PUPPETEER_EXECUTABLE_PATH || 'default'}, args=[${PUPPETEER_ARGS.join(', ')}], authDir=${AUTH_DIR}`
  );
  try {
    await client.initialize();
    logger.info('WhatsApp client initialization finished.');
  } catch (err) {
    launchError = err instanceof Error ? err.message : String(err);
    status = 'puppeteer_error';
    logger.error('Failed to initialize WhatsApp client:', err);
    throw err;
  }
}

export async function stopClient(): Promise<void> {
  logger.info('Stopping WhatsApp client...');
  try {
    await client.destroy();
    logger.info('WhatsApp client stopped.');
  } catch (err) {
    logger.error('Error destroying WhatsApp client:', err);
  }
}

export async function restartClient(): Promise<void> {
  logger.info('Restarting WhatsApp client...');
  await stopClient();
  launchError = null;
  status = 'initializing';
  isReady = false;
  return startClient();
}

export function getQrDataUrl(): string | null {
  return qrDataUrl;
}

export function getStatus(): WhatsAppStatus {
  return { status, isReady };
}

export function getHealth(): WhatsAppHealth {
  logger.debug('getHealth() called');
  let puppeteer: { ok: boolean; detail: string } = {
    ok: false,
    detail: launchError || 'not launched'
  };
  let chrome: { ok: boolean; detail: string } = { ok: false, detail: 'not running' };

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pupClient = client as any;
    if (pupClient.pupBrowser) {
      const ws = pupClient.pupBrowser.wsEndpoint();
      puppeteer = { ok: Boolean(ws), detail: ws ? 'connected' : 'no ws endpoint' };

      const proc = pupClient.pupBrowser.process();
      if (proc?.pid) {
        try {
          process.kill(proc.pid, 0);
          chrome = { ok: true, detail: `pid ${proc.pid}` };
        } catch {
          chrome = { ok: false, detail: 'process not responding' };
        }
      } else {
        chrome = { ok: false, detail: 'no chrome process' };
      }
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    puppeteer = { ok: false, detail: `health check error: ${message}` };
  }

  let whatsapp: { ok: boolean; detail: string } = { ok: isReady, detail: status };
  if (isReady) {
    whatsapp = { ok: true, detail: 'connected' };
  } else if (status === 'puppeteer_error') {
    whatsapp = { ok: false, detail: 'puppeteer failed to launch' };
  }

  return { whatsapp, puppeteer, chrome };
}

export async function getRecentChats(limit = 50): Promise<RawChat[]> {
  if (!isReady) {
    throw new Error('WhatsApp client is not ready');
  }

  logger.debug(`getRecentChats(limit=${limit}) called`);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pupClient = client as any;
  const chats = (await pupClient.pupPage.evaluate(async (chatLimit: number) => {
    // Browser context — types unavailable
    const chatCollection = window.require('WAWebCollections').Chat;
    const all = chatCollection._models || [];
    const sorted = all.slice().sort((a: { t: number }, b: { t: number }) => (b.t || 0) - (a.t || 0));
    const result: RawChat[] = [];

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
      let lastMessage: RawChat['lastMessage'] = null;
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
  }, limit)) as RawChat[];

  return chats;
}

process.on('SIGTERM', async () => {
  logger.info('SIGTERM received; shutting down WhatsApp client.');
  await stopClient();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received; shutting down WhatsApp client.');
  await stopClient();
  process.exit(0);
});
