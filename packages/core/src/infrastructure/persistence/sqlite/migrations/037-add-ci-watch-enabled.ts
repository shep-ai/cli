/**
 * Migration 037: Add ci_watch_enabled column to settings table.
 *
 * Controls whether the CI watch/fix loop runs after pushing a PR.
 * Defaults to 1 (enabled).
 */

import type { MigrationParams } from 'umzug';
import type Database from 'better-sqlite3';

export async function up({ context: db }: MigrationParams<Database.Database>): Promise<void> {
  const columns = db.pragma('table_info(settings)') as { name: string }[];
  if (!columns.some((c) => c.name === 'ci_watch_enabled')) {
    db.exec('ALTER TABLE settings ADD COLUMN ci_watch_enabled INTEGER NOT NULL DEFAULT 1');
  }
}

export async function down({ context: db }: MigrationParams<Database.Database>): Promise<void> {
  void db;
}
