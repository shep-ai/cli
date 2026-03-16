/**
 * Migration 040: Create dev_servers table.
 *
 * Persists running dev server deployments so they survive page reloads
 * and server restarts. The DeploymentService reconciles on startup by
 * checking PID liveness and cleaning up stale rows.
 *
 * Columns:
 *  - target_id   TEXT PRIMARY KEY — featureId or repositoryPath
 *  - target_type TEXT NOT NULL    — 'feature' | 'repository'
 *  - pid         INTEGER NOT NULL — OS process ID
 *  - state       TEXT NOT NULL    — DeploymentState enum value
 *  - url         TEXT             — detected dev server URL (null while Booting)
 *  - target_path TEXT NOT NULL    — filesystem path where the dev server runs
 *  - started_at  INTEGER NOT NULL — unix milliseconds
 */

import type { MigrationParams } from 'umzug';
import type Database from 'better-sqlite3';

export async function up({ context: db }: MigrationParams<Database.Database>): Promise<void> {
  db.exec(`
    CREATE TABLE IF NOT EXISTS dev_servers (
      target_id   TEXT PRIMARY KEY,
      target_type TEXT NOT NULL,
      pid         INTEGER NOT NULL,
      state       TEXT NOT NULL DEFAULT 'Booting',
      url         TEXT,
      target_path TEXT NOT NULL,
      started_at  INTEGER NOT NULL
    )
  `);
}

export async function down({ context: db }: MigrationParams<Database.Database>): Promise<void> {
  db.exec('DROP TABLE IF EXISTS dev_servers');
}
