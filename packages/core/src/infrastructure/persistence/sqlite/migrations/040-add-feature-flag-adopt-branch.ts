/**
 * Migration 040: Add feature_flag_adopt_branch column to settings table.
 *
 * Adds the adopt branch feature flag (default 0 = disabled).
 */

import type { MigrationParams } from 'umzug';
import type Database from 'better-sqlite3';

export async function up({ context: db }: MigrationParams<Database.Database>): Promise<void> {
  const columns = db.pragma('table_info(settings)') as { name: string }[];
  const existing = new Set(columns.map((c) => c.name));

  if (!existing.has('feature_flag_adopt_branch')) {
    db.exec('ALTER TABLE settings ADD COLUMN feature_flag_adopt_branch INTEGER NOT NULL DEFAULT 0');
  }
}

export async function down({ context: db }: MigrationParams<Database.Database>): Promise<void> {
  void db;
}
