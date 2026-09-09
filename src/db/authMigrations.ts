import { getMigrations } from 'better-auth/db/migration';
import * as logger from '../lib/logger.js';

/** Run Better Auth migrations for the given auth options (persistence concern). */
export async function runAuthMigrationsForOptions(options: unknown): Promise<void> {
  try {
    const { runMigrations } = await getMigrations(options as never);
    await runMigrations();
    logger.debug('Better Auth migrations executed successfully');
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error(`Better Auth migration failed: ${message}`);
    throw err;
  }
}
