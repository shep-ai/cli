/**
 * Migration 044: Add spec_storage_mode column to repositories table.
 *
 * Adds a TEXT column with DEFAULT 'in-repo' to control where new feature
 * specs are stored: 'in-repo' (<worktree>/.shep/specs/) or 'shep-managed'
 * (~/.shep/repos/<hash>/specs/).
 */

import type { MigrationParams } from 'umzug';
import type Database from 'better-sqlite3';

export async function up({ context: db }: MigrationParams<Database.Database>): Promise<void> {
  const columns = db.pragma('table_info(repositories)') as { name: string }[];
  const existing = new Set(columns.map((c) => c.name));

  if (!existing.has('spec_storage_mode')) {
    db.exec("ALTER TABLE repositories ADD COLUMN spec_storage_mode TEXT DEFAULT 'in-repo'");
  }
}

export async function down({ context: db }: MigrationParams<Database.Database>): Promise<void> {
  // SQLite does not support DROP COLUMN before 3.35.0.
  // The column remains but is unused after rollback.
  void db;
}
