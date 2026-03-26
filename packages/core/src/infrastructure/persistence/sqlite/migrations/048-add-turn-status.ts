/**
 * Migration 048: Add turn_status column to interactive_sessions.
 *
 * Tracks per-session activity state for UI dot indicators:
 *  - idle: no active turn, nothing to show
 *  - processing: agent is actively working on a response
 *  - unread: agent finished responding but user hasn't seen it yet
 *
 * Used by chat buttons (global/repo/feature) to show activity dots.
 */

import type { MigrationParams } from 'umzug';
import type Database from 'better-sqlite3';

export async function up({ context: db }: MigrationParams<Database.Database>): Promise<void> {
  const columns = db.pragma('table_info(interactive_sessions)') as { name: string }[];
  const names = new Set(columns.map((c) => c.name));

  if (!names.has('turn_status')) {
    db.exec(
      `ALTER TABLE interactive_sessions ADD COLUMN turn_status TEXT NOT NULL DEFAULT 'idle'`
    );
  }
}

export async function down({ context: db }: MigrationParams<Database.Database>): Promise<void> {
  void db;
}
