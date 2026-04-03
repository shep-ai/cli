/**
 * Migration 051: Add injected_skills column to features table.
 *
 * Stores JSON array of skill names that were injected into the
 * feature's worktree at creation time. Nullable for existing features.
 */

import type { MigrationParams } from 'umzug';
import type Database from 'better-sqlite3';

export async function up({ context: db }: MigrationParams<Database.Database>): Promise<void> {
  const columns = db.pragma('table_info(features)') as { name: string }[];
  const names = new Set(columns.map((c) => c.name));

  if (!names.has('injected_skills')) {
    db.exec('ALTER TABLE features ADD COLUMN injected_skills TEXT');
  }
}

export async function down({ context: db }: MigrationParams<Database.Database>): Promise<void> {
  void db;
}
