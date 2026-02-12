/**
 * SQLite Migrations Module
 *
 * Manages database schema migrations using a simple manual approach.
 * Migrations are inlined as TypeScript strings so they survive tsc compilation
 * (tsc only emits .js/.d.ts, not .sql files).
 *
 * Tracks applied migrations using user_version pragma.
 */

import type Database from 'better-sqlite3';

/**
 * Migration definition.
 */
interface Migration {
  version: number;
  sql: string;
}

/**
 * List of all migrations in order.
 * SQL is inlined to avoid runtime file reads that break in production builds.
 */
const MIGRATIONS: Migration[] = [
  {
    version: 1,
    sql: `
-- Migration 001: Create Settings Table
CREATE TABLE IF NOT EXISTS settings (
  id TEXT PRIMARY KEY NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  model_analyze TEXT NOT NULL,
  model_requirements TEXT NOT NULL,
  model_plan TEXT NOT NULL,
  model_implement TEXT NOT NULL,
  user_name TEXT,
  user_email TEXT,
  user_github_username TEXT,
  env_default_editor TEXT NOT NULL,
  env_shell_preference TEXT NOT NULL,
  sys_auto_update INTEGER NOT NULL,
  sys_log_level TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_settings_id ON settings(id);
`,
  },
  {
    version: 2,
    sql: `
-- Migration 002: Add Agent Configuration
ALTER TABLE settings ADD COLUMN agent_type TEXT NOT NULL DEFAULT 'claude-code';
ALTER TABLE settings ADD COLUMN agent_auth_method TEXT NOT NULL DEFAULT 'session';
ALTER TABLE settings ADD COLUMN agent_token TEXT;
`,
  },
  {
    version: 3,
    sql: `
-- Migration 003: Create Agent Runs Table
CREATE TABLE agent_runs (
  id TEXT PRIMARY KEY,
  agent_type TEXT NOT NULL,
  agent_name TEXT NOT NULL,
  status TEXT NOT NULL,
  prompt TEXT NOT NULL,
  result TEXT,
  session_id TEXT,
  thread_id TEXT NOT NULL,
  pid INTEGER,
  last_heartbeat INTEGER,
  started_at INTEGER,
  completed_at INTEGER,
  error TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX idx_agent_runs_status ON agent_runs(status);
CREATE INDEX idx_agent_runs_pid ON agent_runs(pid) WHERE pid IS NOT NULL;
CREATE INDEX idx_agent_runs_thread_id ON agent_runs(thread_id);
`,
  },
  {
    version: 4,
    sql: `
-- Migration 004: Create Features Table
CREATE TABLE features (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT NOT NULL,
  repository_path TEXT NOT NULL,
  branch TEXT NOT NULL,
  lifecycle TEXT NOT NULL DEFAULT 'Requirements',
  messages TEXT NOT NULL DEFAULT '[]',
  plan TEXT,
  related_artifacts TEXT NOT NULL DEFAULT '[]',
  agent_run_id TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX idx_features_slug ON features(slug, repository_path);
CREATE INDEX idx_features_repo ON features(repository_path);
CREATE INDEX idx_features_lifecycle ON features(lifecycle);
`,
  },
  {
    version: 5,
    sql: `
-- Migration 005: Add feature references to agent_runs
ALTER TABLE agent_runs ADD COLUMN feature_id TEXT;
ALTER TABLE agent_runs ADD COLUMN repository_path TEXT;
CREATE INDEX idx_agent_runs_feature ON agent_runs(feature_id) WHERE feature_id IS NOT NULL;
`,
  },
  {
    version: 6,
    sql: `
-- Migration 006: Add approval workflow columns to agent_runs
ALTER TABLE agent_runs ADD COLUMN approval_mode TEXT;
ALTER TABLE agent_runs ADD COLUMN approval_status TEXT;
`,
  },
  {
    version: 7,
    sql: `
-- Migration 007: Add spec_path to features
ALTER TABLE features ADD COLUMN spec_path TEXT;
`,
  },
];

/**
 * Runs all pending database migrations.
 * Safe to call multiple times (idempotent).
 *
 * The user_version pragma tracks which migrations have been applied.
 *
 * @param db - Database instance to run migrations on
 */
export async function runSQLiteMigrations(db: Database.Database): Promise<void> {
  try {
    // Get current schema version
    const result = db.prepare('PRAGMA user_version').get() as {
      user_version: number;
    };
    const currentVersion = result.user_version;

    // Run each pending migration
    for (const migration of MIGRATIONS) {
      if (migration.version > currentVersion) {
        // Execute migration in a transaction
        db.transaction(() => {
          db.exec(migration.sql);
          db.prepare(`PRAGMA user_version = ${migration.version}`).run();
        })();
      }
    }
  } catch (error) {
    throw new Error(
      `Failed to run database migrations: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}
