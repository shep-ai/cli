/**
 * Migration 045: Create interactive_sessions and interactive_messages tables.
 *
 * Adds persistence for the per-feature interactive chat agent feature.
 *
 * Tables:
 *  - interactive_sessions: tracks one long-lived agent process per feature
 *  - interactive_messages: stores all chat messages (user + assistant) per feature
 *
 * Messages are scoped by feature_id (not session_id) so history persists
 * across session restarts. The optional session_id FK allows per-session
 * queries when needed.
 *
 * Indexes:
 *  - interactive_messages(feature_id, created_at) — primary message history query
 *  - interactive_sessions(status) — active session count + zombie cleanup queries
 */

import type { MigrationParams } from 'umzug';
import type Database from 'better-sqlite3';

export async function up({ context: db }: MigrationParams<Database.Database>): Promise<void> {
  db.exec(`
    CREATE TABLE IF NOT EXISTS interactive_sessions (
      id               TEXT PRIMARY KEY,
      feature_id       TEXT NOT NULL,
      status           TEXT NOT NULL CHECK(status IN ('booting','ready','stopped','error')),
      started_at       INTEGER NOT NULL,
      stopped_at       INTEGER,
      last_activity_at INTEGER NOT NULL,
      created_at       INTEGER NOT NULL,
      updated_at       INTEGER NOT NULL
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS interactive_messages (
      id         TEXT PRIMARY KEY,
      feature_id TEXT NOT NULL,
      session_id TEXT REFERENCES interactive_sessions(id),
      role       TEXT NOT NULL CHECK(role IN ('user','assistant')),
      content    TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `);

  db.exec(
    'CREATE INDEX IF NOT EXISTS idx_interactive_messages_feature ON interactive_messages(feature_id, created_at)'
  );
  db.exec(
    'CREATE INDEX IF NOT EXISTS idx_interactive_sessions_status ON interactive_sessions(status)'
  );
}

export async function down({ context: db }: MigrationParams<Database.Database>): Promise<void> {
  db.exec('DROP INDEX IF EXISTS idx_interactive_sessions_status');
  db.exec('DROP INDEX IF EXISTS idx_interactive_messages_feature');
  db.exec('DROP TABLE IF EXISTS interactive_messages');
  db.exec('DROP TABLE IF EXISTS interactive_sessions');
}
