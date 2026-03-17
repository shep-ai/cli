/**
 * Migration 040: Add remote_url column to repositories table.
 *
 * Adds a nullable TEXT column for storing the GitHub remote URL a repository
 * was cloned from. Includes an index for efficient duplicate detection
 * via findByRemoteUrl().
 */

import type { MigrationParams } from 'umzug';
import type Database from 'better-sqlite3';

export async function up({ context: db }: MigrationParams<Database.Database>): Promise<void> {
  const columns = db.pragma('table_info(repositories)') as { name: string }[];
  const existing = new Set(columns.map((c) => c.name));

  if (!existing.has('remote_url')) {
    db.exec('ALTER TABLE repositories ADD COLUMN remote_url TEXT');
  }

  // Add index for efficient duplicate detection by remote URL
  const indexes = db.pragma('index_list(repositories)') as { name: string }[];
  const indexNames = new Set(indexes.map((i) => i.name));
  if (!indexNames.has('idx_repositories_remote_url')) {
    db.exec('CREATE INDEX idx_repositories_remote_url ON repositories(remote_url)');
  }
}

export async function down({ context: db }: MigrationParams<Database.Database>): Promise<void> {
  // SQLite does not support DROP COLUMN before 3.35.0; drop the index only.
  // The column remains but is unused after rollback.
  const indexes = db.pragma('index_list(repositories)') as { name: string }[];
  const indexNames = new Set(indexes.map((i) => i.name));
  if (indexNames.has('idx_repositories_remote_url')) {
    db.exec('DROP INDEX idx_repositories_remote_url');
  }
}
