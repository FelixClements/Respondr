const { Client, LocalAuth } = require('whatsapp-web.js');
const QRCode = require('qrcode');
const logger = require('../lib/logger');

const AUTH_DIR = process.env.AUTH_DIR || './.wwebjs_auth';
const PUPPETEER_EXECUTABLE_PATH = process.env.PUPPETEER_EXECUTABLE_PATH || undefined;
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
  const chats = await client.getChats();
  logger.debug(`getRecentChats got ${chats.length} raw chats`);

  const filtered = chats
    .filter((chat) => !chat.isGroup && !chat.archived && !chat.isMuted)
    .sort((a, b) => {
      const aTs = a.lastMessage?.timestamp || a.timestamp || 0;
      const bTs = b.lastMessage?.timestamp || b.timestamp || 0;
      return bTs - aTs;
    })
    .slice(0, limit);

  logger.debug(`getRecentChats returning ${filtered.length} filtered chats`);

  return filtered.map((chat) => ({
    id: chat.id._serialized || chat.id,
    name: chat.name,
    isGroup: chat.isGroup,
    isArchived: chat.archived,
    isMuted: chat.isMuted,
    lastMessage: chat.lastMessage
      ? {
          fromMe: chat.lastMessage.fromMe,
          timestamp: chat.lastMessage.timestamp,
          timestampMs: chat.lastMessage.timestamp * 1000
        }
      : null
  }));
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
