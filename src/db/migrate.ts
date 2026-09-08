import { runAuthMigrations } from '../server/auth.js';
import * as logger from '../lib/logger.js';

runAuthMigrations()
  .then(() => {
    logger.info('Migrations completed successfully.');
    process.exit(0);
  })
  .catch((err) => {
    logger.error('Migration failed:', err);
    process.exit(1);
  });
