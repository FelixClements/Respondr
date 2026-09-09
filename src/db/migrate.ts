import { runAuthMigrations } from '../server/auth.js';
import * as logger from '../lib/logger.js';

const isDirectInvoke =
  process.argv[1] !== undefined &&
  (process.argv[1].endsWith('migrate.ts') ||
    process.argv[1].endsWith('migrate.js') ||
    process.argv[1].endsWith('dist/db/migrate.js'));

if (isDirectInvoke) {
  runAuthMigrations()
    .then(() => {
      logger.info('Migrations completed successfully.');
      process.exit(0);
    })
    .catch((err) => {
      logger.error('Migration failed:', err);
      process.exit(1);
    });
} else if (process.env.VITEST == null) {
  logger.warn(
    'src/db/migrate.ts imported without direct invoke; skipping migrations. Run `npm run auth:migrate` (host/dev only, requires devDependencies) instead.'
  );
}
