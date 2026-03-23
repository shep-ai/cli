/**
 * Migration 046: Add per-feature workflow columns to features table.
 *
 * Adds ci_watch_enabled (boolean, default 1), enable_evidence (boolean, default 0),
 * and commit_evidence (boolean, default 0) so these workflow settings can be
 * configured per-feature instead of only globally.
 */

import type { MigrationParams } from 'umzug';
import type Database from 'better-sqlite3';

export async function up({ context: db }: MigrationParams<Database.Database>): Promise<void> {
  const columns = db.pragma('table_info(features)') as { name: string }[];
  const names = new Set(columns.map((c) => c.name));

  if (!names.has('ci_watch_enabled')) {
    db.exec('ALTER TABLE features ADD COLUMN ci_watch_enabled INTEGER DEFAULT 1');
  }
  if (!names.has('enable_evidence')) {
    db.exec('ALTER TABLE features ADD COLUMN enable_evidence INTEGER DEFAULT 0');
  }
  if (!names.has('commit_evidence')) {
    db.exec('ALTER TABLE features ADD COLUMN commit_evidence INTEGER DEFAULT 0');
  }
}

export async function down({ context: db }: MigrationParams<Database.Database>): Promise<void> {
  void db;
}
