/**
 * Migration 042: Add hide_ci_status column to settings table.
 *
 * Controls whether CI status badges are displayed in the web UI
 * (feature drawer and merge review). Defaults to 1 (hide CI status).
 *
 * Column values: 0 = show, 1 = hide
 */

import type { MigrationParams } from 'umzug';
import type Database from 'better-sqlite3';

export async function up({ context: db }: MigrationParams<Database.Database>): Promise<void> {
  /* Hide CI status badges from UI (0 = show, 1 = hide) */
  const columns = db.pragma('table_info(settings)') as { name: string }[];
  if (!columns.some((c) => c.name === 'hide_ci_status')) {
    db.exec('ALTER TABLE settings ADD COLUMN hide_ci_status INTEGER NOT NULL DEFAULT 1');
  }
}

export async function down({ context: db }: MigrationParams<Database.Database>): Promise<void> {
  void db;
}
