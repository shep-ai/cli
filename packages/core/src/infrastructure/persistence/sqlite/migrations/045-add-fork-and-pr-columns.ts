/**
 * Migration 045: Add fork-and-PR columns to features table.
 *
 * Adds fork_and_pr (boolean, default 0) and commit_specs (boolean, default 1)
 * for per-feature fork workflow configuration. Also adds upstream PR tracking
 * columns (upstream_pr_url, upstream_pr_number, upstream_pr_status) aligned
 * with the PullRequest value object.
 */

import type { MigrationParams } from 'umzug';
import type Database from 'better-sqlite3';

export async function up({ context: db }: MigrationParams<Database.Database>): Promise<void> {
  const columns = db.pragma('table_info(features)') as { name: string }[];
  const names = new Set(columns.map((c) => c.name));

  if (!names.has('fork_and_pr')) {
    db.exec('ALTER TABLE features ADD COLUMN fork_and_pr INTEGER DEFAULT 0');
  }
  if (!names.has('commit_specs')) {
    db.exec('ALTER TABLE features ADD COLUMN commit_specs INTEGER DEFAULT 1');
  }
  if (!names.has('upstream_pr_url')) {
    db.exec('ALTER TABLE features ADD COLUMN upstream_pr_url TEXT');
  }
  if (!names.has('upstream_pr_number')) {
    db.exec('ALTER TABLE features ADD COLUMN upstream_pr_number INTEGER');
  }
  if (!names.has('upstream_pr_status')) {
    db.exec('ALTER TABLE features ADD COLUMN upstream_pr_status TEXT');
  }
}

export async function down({ context: db }: MigrationParams<Database.Database>): Promise<void> {
  void db;
}
