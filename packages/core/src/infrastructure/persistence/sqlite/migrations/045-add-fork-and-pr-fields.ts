/**
 * Migration 045: Add fork-and-PR fields
 *
 * Adds forkAndPr and commitSpecs workflow flags to features table,
 * plus upstream PR tracking columns (url, number, status).
 */

import type { MigrationParams } from 'umzug';
import type Database from 'better-sqlite3';

export async function up({ context: db }: MigrationParams<Database.Database>): Promise<void> {
  const columns = db.pragma('table_info(features)') as { name: string }[];
  const has = (name: string) => columns.some((c) => c.name === name);

  if (!has('fork_and_pr')) {
    db.exec('ALTER TABLE features ADD COLUMN fork_and_pr INTEGER NOT NULL DEFAULT 0');
  }
  if (!has('commit_specs')) {
    db.exec('ALTER TABLE features ADD COLUMN commit_specs INTEGER NOT NULL DEFAULT 1');
  }
  if (!has('upstream_pr_url')) {
    db.exec('ALTER TABLE features ADD COLUMN upstream_pr_url TEXT');
  }
  if (!has('upstream_pr_number')) {
    db.exec('ALTER TABLE features ADD COLUMN upstream_pr_number INTEGER');
  }
  if (!has('upstream_pr_status')) {
    db.exec('ALTER TABLE features ADD COLUMN upstream_pr_status TEXT');
  }
}

export async function down({ context: db }: MigrationParams<Database.Database>): Promise<void> {
  void db;
}
