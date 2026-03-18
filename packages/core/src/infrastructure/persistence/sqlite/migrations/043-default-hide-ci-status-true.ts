/**
 * Migration 043: Set hide_ci_status default to true for existing rows.
 *
 * Migration 042 added the column with DEFAULT 0 (show). The default has
 * been changed to 1 (hide). This migration flips existing rows that still
 * have the old default.
 */

import type { MigrationParams } from 'umzug';
import type Database from 'better-sqlite3';

export async function up({ context: db }: MigrationParams<Database.Database>): Promise<void> {
  db.exec('UPDATE settings SET hide_ci_status = 1 WHERE hide_ci_status = 0');
}

export async function down({ context: db }: MigrationParams<Database.Database>): Promise<void> {
  void db;
}
