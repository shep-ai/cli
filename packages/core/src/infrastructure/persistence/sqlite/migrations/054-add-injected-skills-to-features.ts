/**
 * Migration 054: Add inject_skills and injected_skills columns to features table.
 *
 * inject_skills: boolean flag indicating skill injection was enabled for this feature.
 * injected_skills: JSON array of skill names that were injected into the worktree.
 */

import type { MigrationParams } from 'umzug';
import type Database from 'better-sqlite3';

export async function up({ context: db }: MigrationParams<Database.Database>): Promise<void> {
  const columns = db.pragma('table_info(features)') as { name: string }[];
  const names = new Set(columns.map((c) => c.name));

  if (!names.has('inject_skills')) {
    db.exec('ALTER TABLE features ADD COLUMN inject_skills INTEGER NOT NULL DEFAULT 0');
  }
  if (!names.has('injected_skills')) {
    db.exec('ALTER TABLE features ADD COLUMN injected_skills TEXT');
  }
}

export async function down({ context: db }: MigrationParams<Database.Database>): Promise<void> {
  void db;
}
