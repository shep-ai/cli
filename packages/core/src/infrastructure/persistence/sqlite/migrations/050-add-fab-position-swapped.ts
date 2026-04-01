/**
 * Migration 050: Add fab_position_swapped column to the settings table.
 *
 * Adds one new column for controlling FAB layout:
 *  - fab_position_swapped (INTEGER DEFAULT 0): when 1, the Create (+) and
 *    Chat FABs swap horizontal positions in the web UI.
 *
 * Default value of 0 keeps the current layout (Create = start, Chat = end).
 * Guards against duplicate column errors using table_info pragma.
 */

import type { MigrationParams } from 'umzug';
import type Database from 'better-sqlite3';

export async function up({ context: db }: MigrationParams<Database.Database>): Promise<void> {
  const columns = db.pragma('table_info(settings)') as { name: string }[];
  const names = new Set(columns.map((c) => c.name));

  if (!names.has('fab_position_swapped')) {
    db.exec('ALTER TABLE settings ADD COLUMN fab_position_swapped INTEGER NOT NULL DEFAULT 0');
  }
}

export async function down({ context: db }: MigrationParams<Database.Database>): Promise<void> {
  void db;
}
