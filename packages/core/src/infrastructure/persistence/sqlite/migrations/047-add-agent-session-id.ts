/**
 * Migration 047: Add agent_session_id column to interactive_sessions.
 *
 * Persists the agent SDK session ID so sessions can be resumed after
 * service restarts (e.g. Next.js hot-reload, server restart). Previously
 * this was only held in-memory, causing each message after a restart to
 * spawn a brand new agent session instead of resuming the existing one.
 *
 * Agent-agnostic: works with Claude, Cursor, Codex, or any future agent.
 */

import type { MigrationParams } from 'umzug';
import type Database from 'better-sqlite3';

export async function up({ context: db }: MigrationParams<Database.Database>): Promise<void> {
  const columns = db.pragma('table_info(interactive_sessions)') as { name: string }[];
  const names = new Set(columns.map((c) => c.name));

  if (!names.has('agent_session_id')) {
    db.exec(`ALTER TABLE interactive_sessions ADD COLUMN agent_session_id TEXT`);
  }
}

export async function down({ context: db }: MigrationParams<Database.Database>): Promise<void> {
  // SQLite doesn't support DROP COLUMN before 3.35.0; recreate table
  db.exec(`
    CREATE TABLE interactive_sessions_backup AS SELECT
      id, feature_id, status, started_at, stopped_at, last_activity_at, created_at, updated_at
    FROM interactive_sessions
  `);
  db.exec('DROP TABLE interactive_sessions');
  db.exec('ALTER TABLE interactive_sessions_backup RENAME TO interactive_sessions');
}
