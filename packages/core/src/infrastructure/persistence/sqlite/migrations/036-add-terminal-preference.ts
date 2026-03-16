/**
 * Migration 035: Add terminal preference to settings.
 *
 * Adds the env_terminal_preference column to the settings table.
 * Defaults to 'system' (OS default terminal).
 */
import type { MigrationParams } from 'umzug';
import type Database from 'better-sqlite3';

export async function up({ context: db }: MigrationParams<Database.Database>): Promise<void> {
  const columns = db.pragma('table_info(settings)') as { name: string }[];
  if (!columns.some((c) => c.name === 'env_terminal_preference')) {
    db.exec(
      "ALTER TABLE settings ADD COLUMN env_terminal_preference TEXT NOT NULL DEFAULT 'system'"
    );
  }
}

export async function down({ context: db }: MigrationParams<Database.Database>): Promise<void> {
  // SQLite does not support DROP COLUMN before version 3.35.0.
  // For safety we recreate the table without the column.
  // However, since this is a simple addition and we guard with IF NOT EXISTS
  // in `up`, a no-op down is acceptable for this migration.
  void db;
}
