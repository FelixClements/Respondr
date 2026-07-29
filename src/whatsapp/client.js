const { Client, LocalAuth } = require('whatsapp-web.js');
const QRCode = require('qrcode');
const fs = require('fs');
const path = require('path');
const logger = require('../lib/logger');

const AUTH_DIR = process.env.AUTH_DIR || './.wwebjs_auth';
const DEFAULT_CHROMIUM_PATH = '/Applications/Chromium.app/Contents/MacOS/Chromium';
const PUPPETEER_EXECUTABLE_PATH = process.env.PUPPETEER_EXECUTABLE_PATH
  || (fs.existsSync(DEFAULT_CHROMIUM_PATH) ? DEFAULT_CHROMIUM_PATH : undefined);
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

let qrDataUrl = null;
let status = 'initializing';
let isReady = false;
let launchError = null;

function clearProfileLocks() {
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
    logger.debug('Could not clear profile locks:', err.message);
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

client.on('qr', async (qr) => {
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

client.on('auth_failure', (msg) => {
  status = 'auth_failure';
  logger.error('WhatsApp authentication failure:', msg);
});

client.on('ready', () => {
  isReady = true;
  status = 'ready';
  logger.info('WhatsApp client is ready.');
});

client.on('disconnected', (reason) => {
  isReady = false;
  status = 'disconnected';
  logger.warn('WhatsApp client disconnected:', reason);
});

client.on('loading_screen', (percent, message) => {
  logger.debug(`WhatsApp loading screen: ${percent}% ${message}`);
});

client.on('change_state', (state) => {
  logger.debug(`WhatsApp state changed: ${state}`);
});

client.on('change_battery', (batteryInfo) => {
  logger.debug(`WhatsApp battery info: ${JSON.stringify(batteryInfo)}`);
});

async function startClient() {
  logger.info('Initializing WhatsApp client...');
  clearProfileLocks();
  logger.debug(`WhatsApp client config: executablePath=${PUPPETEER_EXECUTABLE_PATH || 'default'}, args=[${PUPPETEER_ARGS.join(', ')}], authDir=${AUTH_DIR}`);
  try {
    await client.initialize();
    logger.info('WhatsApp client initialization finished.');
  } catch (err) {
    launchError = err.message;
    status = 'puppeteer_error';
    logger.error('Failed to initialize WhatsApp client:', err);
    throw err;
  }
}

async function stopClient() {
  logger.info('Stopping WhatsApp client...');
  try {
    await client.destroy();
    logger.info('WhatsApp client stopped.');
  } catch (err) {
    logger.error('Error destroying WhatsApp client:', err);
  }
}

async function restartClient() {
  logger.info('Restarting WhatsApp client...');
  await stopClient();
  launchError = null;
  status = 'initializing';
  isReady = false;
  return startClient();
}

function getQrDataUrl() {
  return qrDataUrl;
}

function getStatus() {
  return { status, isReady };
}

function getHealth() {
  logger.debug('getHealth() called');
  let puppeteer = { ok: false, detail: launchError || 'not launched' };
  let chrome = { ok: false, detail: 'not running' };

  try {
    if (client.pupBrowser) {
      logger.debug(`client.pupBrowser present: ${typeof client.pupBrowser}`);
      const ws = client.pupBrowser.wsEndpoint();
      puppeteer = { ok: Boolean(ws), detail: ws ? 'connected' : 'no ws endpoint' };
      logger.debug(`puppeteer wsEndpoint: ${ws || 'none'}`);

      const proc = client.pupBrowser.process();
      if (proc && proc.pid) {
        logger.debug(`chrome process pid: ${proc.pid}`);
        try {
          process.kill(proc.pid, 0);
          chrome = { ok: true, detail: `pid ${proc.pid}` };
        } catch (err) {
          chrome = { ok: false, detail: 'process not responding' };
        }
      } else {
        chrome = { ok: false, detail: 'no chrome process' };
      }
    } else {
      logger.debug('client.pupBrowser is not set');
    }
  } catch (err) {
    logger.error('Error computing puppeteer/chrome health:', err);
    puppeteer = { ok: false, detail: `health check error: ${err.message}` };
  }

  let whatsapp = { ok: isReady, detail: status };
  if (isReady) {
    whatsapp = { ok: true, detail: 'connected' };
  } else if (status === 'puppeteer_error') {
    whatsapp = { ok: false, detail: 'puppeteer failed to launch' };
  }

  return { whatsapp, puppeteer, chrome };
}

async function getRecentChats(limit = 50) {
  if (!isReady) {
    throw new Error('WhatsApp client is not ready');
  }

  logger.debug(`getRecentChats(limit=${limit}) called`);

  const chats = await client.pupPage.evaluate(async (chatLimit) => {
    const chatCollection = window.require('WAWebCollections').Chat;
    const all = chatCollection._models || [];
    const sorted = all.slice().sort((a, b) => (b.t || 0) - (a.t || 0));
    const result = [];

    let meId = null;
    try {
      const User = window.require('WAWebUserPrefs');
      const meWid = User.getMaybeMePnUser ? User.getMaybeMePnUser() : (User.getMaybeMeUser ? User.getMaybeMeUser() : null);
      meId = meWid?._serialized || null;
    } catch (e) {
      try {
        const Contact = window.require('WAWebCollections').Contact;
        if (Contact._models && Contact._models.find) {
          const meContact = Contact._models.find((c) => c.isMe === true);
          meId = meContact?.id?._serialized || null;
        }
      } catch (e2) {}
    }

    function hasReactionFromMe(msg) {
      if (!msg || !msg.reactions) return false;
      const r = msg.reactions;
      if (r.reactionByMe) return true;
      const models = r._models || r.models || [];
      if (models.length) {
        return models.some((rx) => {
          if (rx.reactionByMe) return true;
          if (rx.hasReactionByMe === true) return true;
          const senders = rx.senders || (rx._models && rx._models.map((m) => m.sender));
          if (senders && senders.length) {
            return senders.some((s) => s && (s.isMe === true || (meId && s.id && s.id._serialized === meId)));
          }
          return false;
        });
      }
      return false;
    }

    for (const chat of sorted) {
      if (result.length >= chatLimit) break;

      const serialized = chat.serialize ? chat.serialize() : {};
      const isGroup = !!chat.groupMetadata;
      const isArchived = Boolean(serialized.archive);
      const isMuted = chat.mute && chat.mute.expiration !== 0;

      if (isGroup || isArchived || isMuted) continue;

      const targetTs = chat.t || 0;
      let lastMessage = null;
      const msgs = chat.msgs ? chat.msgs._models : [];

      if (msgs.length) {
        const match = msgs.find((m) => m.t === targetTs);
        const last = match || msgs.reduce((a, b) => (b.t > a.t ? b : a), msgs[0]);
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
        } catch (e) {}
      }

      result.push({
        id: chat.id._serialized,
        name: chat.formattedTitle,
        isGroup,
        isArchived,
        isMuted,
        lastMessage
      });
    }

    return result;
  }, limit);

  const reactedCount = chats.filter((c) => c.lastMessage && c.lastMessage.hasReactionFromMe).length;
  logger.debug(`getRecentChats returning ${chats.length} chats, ${reactedCount} with my reaction on the last message`);
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

module.exports = {
  startClient,
  stopClient,
  restartClient,
  getQrDataUrl,
  getStatus,
  getHealth,
  getRecentChats
};
