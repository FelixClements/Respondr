import { getMigrations } from 'better-auth/db/migration';
import * as logger from '../lib/logger.js';
import { getDb } from './index.js';

/** Run Better Auth migrations for the given auth options (persistence concern). */
export async function runAuthMigrationsForOptions(options: unknown): Promise<void> {
  try {
    const { runMigrations } = await getMigrations(options as never);
    await runMigrations();
    dropLegacyAccountIssuer();
    logger.debug('Better Auth migrations executed successfully');
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error(`Better Auth migration failed: ${message}`);
    throw err;
  }
}

/**
 * Better Auth 1.7.1 created `account.issuer TEXT NOT NULL`; later versions
 * neither define nor fill it, so creating an account on such a database would
 * fail. Better Auth migrations only add columns, so drop it (and its index) here.
 */
function dropLegacyAccountIssuer(): void {
  const db = getDb();
  const columns = db.prepare("SELECT name FROM pragma_table_info('account')").all() as {
    name: string;
  }[];
  if (!columns.some((c) => c.name === 'issuer')) return;
  // 1.7.1 also indexed it (unique on issuer + accountId); SQLite refuses to
  // drop a column an index still uses.
  const indexes = db
    .prepare(
      `SELECT il.name FROM pragma_index_list('account') il
       WHERE il.origin = 'c'
         AND EXISTS (SELECT 1 FROM pragma_index_info(il.name) ii WHERE ii.name = 'issuer')`
    )
    .all() as { name: string }[];
  db.transaction(() => {
    for (const { name } of indexes) db.exec(`DROP INDEX "${name.replaceAll('"', '""')}"`);
    db.exec('ALTER TABLE account DROP COLUMN issuer');
  })();
  logger.info('Dropped legacy account.issuer column');
}
