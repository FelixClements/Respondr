const { Client, LocalAuth } = require('whatsapp-web.js');
const QRCode = require('qrcode');

const AUTH_DIR = process.env.AUTH_DIR || './.wwebjs_auth';
const PUPPETEER_EXECUTABLE_PATH = process.env.PUPPETEER_EXECUTABLE_PATH || undefined;
const PUPPETEER_ARGS = process.env.PUPPETEER_ARGS
  ? process.env.PUPPETEER_ARGS.split(' ')
  : ['--no-sandbox', '--disable-setuid-sandbox'];

let qrDataUrl = null;
let status = 'initializing';
let isReady = false;

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
  try {
    qrDataUrl = await QRCode.toDataURL(qr);
    console.log('QR code generated; scan it to link WhatsApp.');
  } catch (err) {
    console.error('Failed to generate QR code:', err);
  }
});

client.on('authenticated', () => {
  status = 'authenticated';
  console.log('WhatsApp authenticated.');
});

client.on('auth_failure', (msg) => {
  status = 'auth_failure';
  console.error('WhatsApp authentication failure:', msg);
});

client.on('ready', () => {
  isReady = true;
  status = 'ready';
  console.log('WhatsApp client is ready.');
});

client.on('disconnected', (reason) => {
  isReady = false;
  status = 'disconnected';
  console.log('WhatsApp client disconnected:', reason);
});

async function startClient() {
  return client.initialize();
}

async function stopClient() {
  try {
    await client.destroy();
  } catch (err) {
    console.error('Error destroying WhatsApp client:', err);
  }
}

function getQrDataUrl() {
  return qrDataUrl;
}

function getStatus() {
  return { status, isReady };
}

async function getRecentChats(limit = 50) {
  if (!isReady) {
    throw new Error('WhatsApp client is not ready');
  }

  const chats = await client.getChats();
  const filtered = chats
    .filter((chat) => !chat.isGroup && !chat.archived && !chat.isMuted)
    .sort((a, b) => {
      const aTs = a.lastMessage?.timestamp || a.timestamp || 0;
      const bTs = b.lastMessage?.timestamp || b.timestamp || 0;
      return bTs - aTs;
    })
    .slice(0, limit);

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
  console.log('SIGTERM received; shutting down WhatsApp client.');
  await stopClient();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received; shutting down WhatsApp client.');
  await stopClient();
  process.exit(0);
});

module.exports = {
  startClient,
  stopClient,
  getQrDataUrl,
  getStatus,
  getRecentChats
};
