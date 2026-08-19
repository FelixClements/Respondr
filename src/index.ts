import 'dotenv/config';
import { serve } from '@hono/node-server';
import { prepareApp } from './server/index.js';
import { initDb } from './db/index.js';
import * as settingsDb from './db/settings.js';
import { startClient } from './whatsapp/client.js';
import * as scheduler from './scheduler.js';
import * as logger from './lib/logger.js';
import { seedFromEnv } from './notifications/config.js';
import * as webPush from './notifications/web-push.js';

async function main() {
  initDb();
  settingsDb.seedDefaults();
  logger.setLevel(settingsDb.get('log_level') || 'info');
  logger.info(`Log level set to ${logger.getLevel()}`);
  seedFromEnv();
  webPush.init();

  const port = parseInt(process.env.PORT || '9595', 10);
  const app = await prepareApp();

  serve({ fetch: app.fetch, port }, (info) => {
    logger.info(`Respondr server running on http://localhost:${info.port}`);
  });

  try {
    await startClient();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.debug(`startClient() threw: ${message}`);
  }

  scheduler.start();
}

main().catch((err) => {
  logger.error(`Fatal error: ${err}`);
  process.exit(1);
});
