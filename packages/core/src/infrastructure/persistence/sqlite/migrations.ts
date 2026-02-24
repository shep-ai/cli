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
  /** Optional handler for migrations that need programmatic logic (e.g. conditional DDL). */
  handler?: (db: Database.Database) => void;
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
  {
    version: 8,
    sql: `
-- Migration 008: Add approval_gates JSON column and phase_timings table
ALTER TABLE agent_runs ADD COLUMN approval_gates TEXT;

-- Transform existing approval_mode strings to JSON
UPDATE agent_runs SET approval_gates = '{"allowPrd":true,"allowPlan":false}'
  WHERE approval_mode = 'allow-prd';
UPDATE agent_runs SET approval_gates = '{"allowPrd":false,"allowPlan":true}'
  WHERE approval_mode = 'allow-plan';
UPDATE agent_runs SET approval_gates = '{"allowPrd":true,"allowPlan":true}'
  WHERE approval_mode = 'allow-all';
UPDATE agent_runs SET approval_gates = '{"allowPrd":false,"allowPlan":false}'
  WHERE approval_mode = 'interactive';

-- Create phase_timings table
CREATE TABLE phase_timings (
  id TEXT PRIMARY KEY,
  agent_run_id TEXT NOT NULL,
  phase TEXT NOT NULL,
  started_at INTEGER NOT NULL,
  completed_at INTEGER,
  duration_ms INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX idx_phase_timings_run ON phase_timings(agent_run_id);
`,
  },
  {
    version: 9,
    sql: `
-- Migration 009: Add Notification Preferences to Settings
ALTER TABLE settings ADD COLUMN notif_in_app_enabled INTEGER NOT NULL DEFAULT 1;
ALTER TABLE settings ADD COLUMN notif_browser_enabled INTEGER NOT NULL DEFAULT 1;
ALTER TABLE settings ADD COLUMN notif_desktop_enabled INTEGER NOT NULL DEFAULT 1;
ALTER TABLE settings ADD COLUMN notif_evt_agent_started INTEGER NOT NULL DEFAULT 1;
ALTER TABLE settings ADD COLUMN notif_evt_phase_completed INTEGER NOT NULL DEFAULT 1;
ALTER TABLE settings ADD COLUMN notif_evt_waiting_approval INTEGER NOT NULL DEFAULT 1;
ALTER TABLE settings ADD COLUMN notif_evt_agent_completed INTEGER NOT NULL DEFAULT 1;
ALTER TABLE settings ADD COLUMN notif_evt_agent_failed INTEGER NOT NULL DEFAULT 1;
`,
  },
  {
    version: 10,
    sql: `
-- Migration 010: Add workflow flags, PR tracking to features; workflow config to settings; lifecycle migration

-- Workflow configuration flags on features
ALTER TABLE features ADD COLUMN open_pr INTEGER NOT NULL DEFAULT 0;
ALTER TABLE features ADD COLUMN auto_merge INTEGER NOT NULL DEFAULT 0;
ALTER TABLE features ADD COLUMN allow_prd INTEGER NOT NULL DEFAULT 0;
ALTER TABLE features ADD COLUMN allow_plan INTEGER NOT NULL DEFAULT 0;
ALTER TABLE features ADD COLUMN allow_merge INTEGER NOT NULL DEFAULT 0;

-- PR tracking state on features
ALTER TABLE features ADD COLUMN pr_url TEXT;
ALTER TABLE features ADD COLUMN pr_number INTEGER;
ALTER TABLE features ADD COLUMN pr_status TEXT;
ALTER TABLE features ADD COLUMN commit_hash TEXT;
ALTER TABLE features ADD COLUMN ci_status TEXT;

-- Workflow defaults on settings
ALTER TABLE settings ADD COLUMN workflow_open_pr_on_impl_complete INTEGER NOT NULL DEFAULT 0;
ALTER TABLE settings ADD COLUMN workflow_auto_merge_on_impl_complete INTEGER NOT NULL DEFAULT 0;

-- Migrate existing features with DeployAndQA lifecycle to Maintain
UPDATE features SET lifecycle = 'Maintain' WHERE lifecycle = 'Deploy & QA';
`,
  },
  {
    version: 11,
    sql: `
-- Migration 011: Add worktree_path to features
ALTER TABLE features ADD COLUMN worktree_path TEXT;
`,
  },
  {
    version: 12,
    sql: `
-- Migration 012: Add push column to features
ALTER TABLE features ADD COLUMN push INTEGER NOT NULL DEFAULT 0;
`,
  },
  {
    version: 13,
    sql: `
-- Migration 013: Add user_query to features for preserving verbatim user input
ALTER TABLE features ADD COLUMN user_query TEXT NOT NULL DEFAULT '';
`,
  },
  {
    version: 14,
    sql: `
-- Migration 014: Add approval wait timing columns to phase_timings
ALTER TABLE phase_timings ADD COLUMN waiting_approval_at INTEGER;
ALTER TABLE phase_timings ADD COLUMN approval_wait_ms INTEGER;
`,
  },
  {
    version: 15,
    sql: `
-- Migration 015: Create Repositories Table and backfill from features

-- 1. Create repositories table
CREATE TABLE repositories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  path TEXT NOT NULL UNIQUE,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX idx_repositories_path ON repositories(path);

-- 2. Extract unique repository_path values from features into repositories
INSERT INTO repositories (id, name, path, created_at, updated_at)
SELECT
  lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' || substr(hex(randomblob(2)),2) || '-' || substr('89ab', abs(random()) % 4 + 1, 1) || substr(hex(randomblob(2)),2) || '-' || hex(randomblob(6))) AS id,
  CASE
    WHEN instr(repository_path, '/') > 0
    THEN replace(repository_path, rtrim(repository_path, replace(repository_path, '/', '')), '')
    ELSE repository_path
  END AS name,
  repository_path AS path,
  MIN(created_at) AS created_at,
  MAX(updated_at) AS updated_at
FROM features
WHERE repository_path IS NOT NULL AND repository_path != ''
GROUP BY repository_path;

-- 3. Add repository_id column to features
ALTER TABLE features ADD COLUMN repository_id TEXT;

-- 4. Backfill repository_id on all existing features
UPDATE features SET repository_id = (
  SELECT r.id FROM repositories r WHERE r.path = features.repository_path
);
`,
  },
  {
    version: 16,
    sql: `
-- Migration 016: Add soft delete support to repositories
ALTER TABLE repositories ADD COLUMN deleted_at INTEGER;
`,
  },
  {
    version: 17,
    sql: `
-- Migration 017: Fix repository names backfilled incorrectly in migration 015
-- The original substr formula extracted from the wrong position.
-- Correct approach: strip the last path segment using rtrim trick.
UPDATE repositories
SET name = replace(path, rtrim(path, replace(path, '/', '')), '')
WHERE instr(path, '/') > 0;
`,
  },
  {
    version: 18,
    sql: `
-- Migration 018: Add onboarding and approval gate default columns
ALTER TABLE settings ADD COLUMN onboarding_complete INTEGER NOT NULL DEFAULT 0;
ALTER TABLE settings ADD COLUMN approval_gate_allow_prd INTEGER NOT NULL DEFAULT 0;
ALTER TABLE settings ADD COLUMN approval_gate_allow_plan INTEGER NOT NULL DEFAULT 0;
ALTER TABLE settings ADD COLUMN approval_gate_allow_merge INTEGER NOT NULL DEFAULT 0;
ALTER TABLE settings ADD COLUMN approval_gate_push_on_impl_complete INTEGER NOT NULL DEFAULT 0;

-- Existing users should NOT be forced through onboarding
UPDATE settings SET onboarding_complete = 1 WHERE id IS NOT NULL;
`,
  },
  {
    version: 19,
    sql: `
-- Migration 019: Add CI fix tracking columns to features
ALTER TABLE features ADD COLUMN ci_fix_attempts INTEGER;
ALTER TABLE features ADD COLUMN ci_fix_history TEXT;
`,
  },
  {
    version: 20,
    // Migration 020: Add parent_id to features for hierarchical feature dependencies
    // Uses custom handler because the column may already exist from a pre-rebase migration 19.
    sql: '',
    handler: (db: Database.Database) => {
      const columns = db.pragma('table_info(features)') as { name: string }[];
      if (!columns.some((c) => c.name === 'parent_id')) {
        db.exec('ALTER TABLE features ADD COLUMN parent_id TEXT');
      }
      // CREATE INDEX IF NOT EXISTS is supported by SQLite
      db.exec('CREATE INDEX IF NOT EXISTS idx_features_parent_id ON features(parent_id)');
    },
  },
];

/**
 * The latest schema version (highest migration version number).
 * Exported for test assertions so they don't hardcode version numbers.
 */
export const LATEST_SCHEMA_VERSION = MIGRATIONS[MIGRATIONS.length - 1].version;

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
          if (migration.sql) {
            db.exec(migration.sql);
          }
          if (migration.handler) {
            migration.handler(db);
          }
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
