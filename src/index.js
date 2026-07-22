require('dotenv').config();

const { serve } = require('@hono/node-server');
const { createApp } = require('./server');
const { initDb } = require('./db');
const { startClient } = require('./whatsapp/client');
const scheduler = require('./scheduler');
const logger = require('./lib/logger');

async function main() {
  initDb();

  const port = process.env.PORT || 9595;
  const app = createApp();

  serve({ fetch: app.fetch, port }, (info) => {
    logger.info(`Respondr server running on http://localhost:${info.port}`);
  });

  try {
    await startClient();
  } catch (err) {
    logger.error(`WhatsApp client failed to initialize: ${err.message}`);
  }

  scheduler.start();
}

main().catch((err) => {
  logger.error(`Fatal error: ${err}`);
  process.exit(1);
});
