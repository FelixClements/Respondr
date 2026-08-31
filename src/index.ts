import 'dotenv/config';
import { serve } from '@hono/node-server';
import { prepareApp } from './server/index.js';
import { initDb } from './db/index.js';
import * as settingsDb from './db/settings.js';
import { startClient } from './whatsapp/session.js';
import * as scheduler from './scheduler.js';
import * as logger from './lib/logger.js';
import { initNotifications } from './notifications/index.js';
import { validateProductionConfig } from './server/security.js';

async function main() {
  validateProductionConfig();
  initDb();
  settingsDb.seedDefaults();
  logger.setLevel(settingsDb.get('log_level') || 'info');
  logger.info(`Log level set to ${logger.getLevel()}`);
  initNotifications();

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
