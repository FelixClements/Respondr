require('dotenv').config();

const { serve } = require('@hono/node-server');
const { createApp } = require('./server');
const { initDb } = require('./db');
const settingsDb = require('./db/settings');
const { startClient } = require('./whatsapp/client');
const scheduler = require('./scheduler');
const logger = require('./lib/logger');
const { seedFromEnv: seedNotifications } = require('./notifications/config');

async function main() {
  initDb();
  logger.setLevel(settingsDb.get('log_level'));
  logger.info(`Log level set to ${logger.getLevel()}`);
  seedNotifications();

  const port = process.env.PORT || 9595;
  const app = createApp();

  serve({ fetch: app.fetch, port }, (info) => {
    logger.info(`Respondr server running on http://localhost:${info.port}`);
  });

  try {
    await startClient();
  } catch (err) {
    logger.debug(`startClient() threw: ${err.message}`);
  }

  scheduler.start();
}

main().catch((err) => {
  logger.error(`Fatal error: ${err}`);
  process.exit(1);
});
