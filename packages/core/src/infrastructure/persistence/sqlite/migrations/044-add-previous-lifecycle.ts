/**
 * Migration 044: Add previous_lifecycle column to features table.
 *
 * Stores the lifecycle state prior to archiving so it can be restored
 * when a feature is unarchived. Nullable TEXT — only populated when
 * the feature lifecycle is Archived.
 */

import type { MigrationParams } from 'umzug';
import type Database from 'better-sqlite3';

export async function up({ context: db }: MigrationParams<Database.Database>): Promise<void> {
  const columns = db.pragma('table_info(features)') as { name: string }[];
  if (!columns.some((c) => c.name === 'previous_lifecycle')) {
    db.exec('ALTER TABLE features ADD COLUMN previous_lifecycle TEXT');
  }
}

export async function down({ context: db }: MigrationParams<Database.Database>): Promise<void> {
  void db;
}
