/**
 * Migration 044: Add fork-related columns to repositories table.
 *
 * Adds is_fork (boolean as integer) and upstream_url (text) columns for
 * tracking repositories that were auto-forked during import because the
 * user lacked push access to the original.
 */

import type { MigrationParams } from 'umzug';
import type Database from 'better-sqlite3';

export async function up({ context: db }: MigrationParams<Database.Database>): Promise<void> {
  const columns = db.pragma('table_info(repositories)') as { name: string }[];
  const existing = new Set(columns.map((c) => c.name));

  if (!existing.has('is_fork')) {
    db.exec('ALTER TABLE repositories ADD COLUMN is_fork INTEGER DEFAULT 0');
  }

  if (!existing.has('upstream_url')) {
    db.exec('ALTER TABLE repositories ADD COLUMN upstream_url TEXT');
  }

  // Add index for finding existing forks by upstream URL
  const indexes = db.pragma('index_list(repositories)') as { name: string }[];
  const indexNames = new Set(indexes.map((i) => i.name));
  if (!indexNames.has('idx_repositories_upstream_url')) {
    db.exec('CREATE INDEX idx_repositories_upstream_url ON repositories(upstream_url)');
  }
}

export async function down({ context: db }: MigrationParams<Database.Database>): Promise<void> {
  const indexes = db.pragma('index_list(repositories)') as { name: string }[];
  const indexNames = new Set(indexes.map((i) => i.name));
  if (indexNames.has('idx_repositories_upstream_url')) {
    db.exec('DROP INDEX idx_repositories_upstream_url');
  }
}
