/**
 * Migration 035: Add stage_timeout_ms column to settings table.
 *
 * Adds a nullable INTEGER column for configuring the per-stage agent
 * executor timeout (in milliseconds). When NULL, the application
 * falls back to the hardcoded default of 600_000 ms (10 minutes).
 */

import type { MigrationParams } from 'umzug';
import type Database from 'better-sqlite3';

export async function up({ context: db }: MigrationParams<Database.Database>): Promise<void> {
  const columns = db.pragma('table_info(settings)') as { name: string }[];
  if (!columns.some((c) => c.name === 'stage_timeout_ms')) {
    db.exec('ALTER TABLE settings ADD COLUMN stage_timeout_ms INTEGER');
  }
}

export async function down({ context: db }: MigrationParams<Database.Database>): Promise<void> {
  // SQLite does not support DROP COLUMN before 3.35.0; recreate if needed.
  // For simplicity, this is a no-op — the column is nullable and ignored when absent.
  void db;
}
