/**
 * Migration 049: Add default_fast_mode column to the settings table.
 *
 * Adds a new column for the workflow default fast mode setting:
 *  - default_fast_mode (INTEGER DEFAULT 1): whether new features default to fast mode
 *
 * Default is 1 (true) so new and existing installations get fast mode as the default.
 * Guards against duplicate column errors using table_info pragma.
 */

import type { MigrationParams } from 'umzug';
import type Database from 'better-sqlite3';

export async function up({ context: db }: MigrationParams<Database.Database>): Promise<void> {
  const columns = db.pragma('table_info(settings)') as { name: string }[];
  const names = new Set(columns.map((c) => c.name));

  if (!names.has('default_fast_mode')) {
    db.exec('ALTER TABLE settings ADD COLUMN default_fast_mode INTEGER NOT NULL DEFAULT 1');
  }
}

export async function down({ context: db }: MigrationParams<Database.Database>): Promise<void> {
  void db;
}
