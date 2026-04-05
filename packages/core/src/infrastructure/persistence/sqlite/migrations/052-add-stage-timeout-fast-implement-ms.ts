/**
 * Migration 052: Add fast-implement stage timeout column to settings table.
 *
 * Adds a dedicated nullable INTEGER column for the fast-implement stage timeout
 * (milliseconds). When NULL, the application falls back to the hardcoded default
 * of 1_800_000 ms (30 minutes).
 *
 * Column added:
 *  - stage_timeout_fast_implement_ms
 */

import type { MigrationParams } from 'umzug';
import type Database from 'better-sqlite3';

export async function up({ context: db }: MigrationParams<Database.Database>): Promise<void> {
  const columns = db.pragma('table_info(settings)') as { name: string }[];
  const existingNames = new Set(columns.map((c) => c.name));

  if (!existingNames.has('stage_timeout_fast_implement_ms')) {
    db.exec('ALTER TABLE settings ADD COLUMN stage_timeout_fast_implement_ms INTEGER');
  }
}

export async function down({ context: db }: MigrationParams<Database.Database>): Promise<void> {
  // SQLite does not support DROP COLUMN before 3.35.0; the column is
  // nullable and ignored when absent, so this is a no-op.
  void db;
}
