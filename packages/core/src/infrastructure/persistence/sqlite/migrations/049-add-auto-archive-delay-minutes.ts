/**
 * Migration 049: Add auto_archive_delay_minutes column to the settings table.
 *
 * Adds one new column for configuring automatic archiving of completed features:
 *  - auto_archive_delay_minutes (INTEGER DEFAULT 10): minutes after completion
 *    before a Maintain-state feature is auto-archived. 0 = disabled.
 *
 * Default value of 10 means completed features are archived after 10 minutes.
 * Guards against duplicate column errors using table_info pragma.
 */

import type { MigrationParams } from 'umzug';
import type Database from 'better-sqlite3';

export async function up({ context: db }: MigrationParams<Database.Database>): Promise<void> {
  const columns = db.pragma('table_info(settings)') as { name: string }[];
  const names = new Set(columns.map((c) => c.name));

  if (!names.has('auto_archive_delay_minutes')) {
    db.exec(
      'ALTER TABLE settings ADD COLUMN auto_archive_delay_minutes INTEGER NOT NULL DEFAULT 10'
    );
  }
}

export async function down({ context: db }: MigrationParams<Database.Database>): Promise<void> {
  void db;
}
