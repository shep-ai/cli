/**
 * Legacy Migration Definitions (V1–V34)
 *
 * Registers the 34 existing migrations as umzug-compatible RunnableMigration objects.
 * Each migration preserves the exact SQL and/or handler logic from the original
 * migrations.ts, wrapped in a transaction that also sets PRAGMA user_version.
 *
 * Legacy migrations are kept inline in a single module because:
 *   1. Avoids 34-file churn for frozen history
 *   2. Handles the 7 handler-based migrations (V20–V31) naturally
 *   3. Survives tsc compilation (inline SQL, no .sql files)
 *
 * New migrations (35+) are individual .ts files in the migrations/ directory.
 */

import type Database from 'better-sqlite3';
import type { RunnableMigration, MigrationParams } from 'umzug';

/**
 * Internal migration definition — mirrors the original Migration interface.
 */
interface LegacyMigrationDef {
  version: number;
  name: string;
  sql: string;
  handler?: (db: Database.Database) => void;
}

/**
 * The 34 legacy migration definitions with descriptive names and SQL/handler logic.
 */
const MIGRATION_DEFS: LegacyMigrationDef[] = [
  {
    version: 1,
    name: '001-create-settings-table',
    sql: `
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
    name: '002-add-agent-config',
    sql: `
ALTER TABLE settings ADD COLUMN agent_type TEXT NOT NULL DEFAULT 'claude-code';
ALTER TABLE settings ADD COLUMN agent_auth_method TEXT NOT NULL DEFAULT 'session';
ALTER TABLE settings ADD COLUMN agent_token TEXT;
`,
  },
  {
    version: 3,
    name: '003-create-agent-runs',
    sql: `
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
    name: '004-create-features',
    sql: `
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
    name: '005-add-feature-refs-to-agent-runs',
    sql: `
ALTER TABLE agent_runs ADD COLUMN feature_id TEXT;
ALTER TABLE agent_runs ADD COLUMN repository_path TEXT;
CREATE INDEX idx_agent_runs_feature ON agent_runs(feature_id) WHERE feature_id IS NOT NULL;
`,
  },
  {
    version: 6,
    name: '006-add-approval-workflow',
    sql: `
ALTER TABLE agent_runs ADD COLUMN approval_mode TEXT;
ALTER TABLE agent_runs ADD COLUMN approval_status TEXT;
`,
  },
  {
    version: 7,
    name: '007-add-spec-path',
    sql: `
ALTER TABLE features ADD COLUMN spec_path TEXT;
`,
  },
  {
    version: 8,
    name: '008-add-approval-gates-and-phase-timings',
    sql: `
ALTER TABLE agent_runs ADD COLUMN approval_gates TEXT;

UPDATE agent_runs SET approval_gates = '{"allowPrd":true,"allowPlan":false}'
  WHERE approval_mode = 'allow-prd';
UPDATE agent_runs SET approval_gates = '{"allowPrd":false,"allowPlan":true}'
  WHERE approval_mode = 'allow-plan';
UPDATE agent_runs SET approval_gates = '{"allowPrd":true,"allowPlan":true}'
  WHERE approval_mode = 'allow-all';
UPDATE agent_runs SET approval_gates = '{"allowPrd":false,"allowPlan":false}'
  WHERE approval_mode = 'interactive';

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
    name: '009-add-notification-preferences',
    sql: `
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
    name: '010-add-workflow-flags-and-pr-tracking',
    sql: `
ALTER TABLE features ADD COLUMN open_pr INTEGER NOT NULL DEFAULT 0;
ALTER TABLE features ADD COLUMN auto_merge INTEGER NOT NULL DEFAULT 0;
ALTER TABLE features ADD COLUMN allow_prd INTEGER NOT NULL DEFAULT 0;
ALTER TABLE features ADD COLUMN allow_plan INTEGER NOT NULL DEFAULT 0;
ALTER TABLE features ADD COLUMN allow_merge INTEGER NOT NULL DEFAULT 0;

ALTER TABLE features ADD COLUMN pr_url TEXT;
ALTER TABLE features ADD COLUMN pr_number INTEGER;
ALTER TABLE features ADD COLUMN pr_status TEXT;
ALTER TABLE features ADD COLUMN commit_hash TEXT;
ALTER TABLE features ADD COLUMN ci_status TEXT;

ALTER TABLE settings ADD COLUMN workflow_open_pr_on_impl_complete INTEGER NOT NULL DEFAULT 0;
ALTER TABLE settings ADD COLUMN workflow_auto_merge_on_impl_complete INTEGER NOT NULL DEFAULT 0;

UPDATE features SET lifecycle = 'Maintain' WHERE lifecycle = 'Deploy & QA';
`,
  },
  {
    version: 11,
    name: '011-add-worktree-path',
    sql: `
ALTER TABLE features ADD COLUMN worktree_path TEXT;
`,
  },
  {
    version: 12,
    name: '012-add-push-column',
    sql: `
ALTER TABLE features ADD COLUMN push INTEGER NOT NULL DEFAULT 0;
`,
  },
  {
    version: 13,
    name: '013-add-user-query',
    sql: `
ALTER TABLE features ADD COLUMN user_query TEXT NOT NULL DEFAULT '';
`,
  },
  {
    version: 14,
    name: '014-add-approval-wait-timing',
    sql: `
ALTER TABLE phase_timings ADD COLUMN waiting_approval_at INTEGER;
ALTER TABLE phase_timings ADD COLUMN approval_wait_ms INTEGER;
`,
  },
  {
    version: 15,
    name: '015-create-repositories-and-backfill',
    sql: `
CREATE TABLE repositories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  path TEXT NOT NULL UNIQUE,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX idx_repositories_path ON repositories(path);

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

ALTER TABLE features ADD COLUMN repository_id TEXT;

UPDATE features SET repository_id = (
  SELECT r.id FROM repositories r WHERE r.path = features.repository_path
);
`,
  },
  {
    version: 16,
    name: '016-add-repository-soft-delete',
    sql: `
ALTER TABLE repositories ADD COLUMN deleted_at INTEGER;
`,
  },
  {
    version: 17,
    name: '017-fix-repository-names',
    sql: `
UPDATE repositories
SET name = replace(path, rtrim(path, replace(path, '/', '')), '')
WHERE instr(path, '/') > 0;
`,
  },
  {
    version: 18,
    name: '018-add-onboarding-and-approval-defaults',
    sql: `
ALTER TABLE settings ADD COLUMN onboarding_complete INTEGER NOT NULL DEFAULT 0;
ALTER TABLE settings ADD COLUMN approval_gate_allow_prd INTEGER NOT NULL DEFAULT 0;
ALTER TABLE settings ADD COLUMN approval_gate_allow_plan INTEGER NOT NULL DEFAULT 0;
ALTER TABLE settings ADD COLUMN approval_gate_allow_merge INTEGER NOT NULL DEFAULT 0;
ALTER TABLE settings ADD COLUMN approval_gate_push_on_impl_complete INTEGER NOT NULL DEFAULT 0;

UPDATE settings SET onboarding_complete = 1 WHERE id IS NOT NULL;
`,
  },
  {
    version: 19,
    name: '019-add-ci-fix-tracking',
    sql: `
ALTER TABLE features ADD COLUMN ci_fix_attempts INTEGER;
ALTER TABLE features ADD COLUMN ci_fix_history TEXT;
`,
  },
  {
    version: 20,
    name: '020-add-parent-id-and-backfill-ci-fix',
    sql: '',
    handler: (db: Database.Database) => {
      const columns = db.pragma('table_info(features)') as { name: string }[];
      if (!columns.some((c) => c.name === 'ci_fix_attempts')) {
        db.exec('ALTER TABLE features ADD COLUMN ci_fix_attempts INTEGER');
      }
      if (!columns.some((c) => c.name === 'ci_fix_history')) {
        db.exec('ALTER TABLE features ADD COLUMN ci_fix_history TEXT');
      }
      if (!columns.some((c) => c.name === 'parent_id')) {
        db.exec('ALTER TABLE features ADD COLUMN parent_id TEXT');
      }
      db.exec('CREATE INDEX IF NOT EXISTS idx_features_parent_id ON features(parent_id)');
    },
  },
  {
    version: 21,
    name: '021-backfill-ci-fix-columns',
    sql: '',
    handler: (db: Database.Database) => {
      const columns = db.pragma('table_info(features)') as { name: string }[];
      if (!columns.some((c) => c.name === 'ci_fix_attempts')) {
        db.exec('ALTER TABLE features ADD COLUMN ci_fix_attempts INTEGER');
      }
      if (!columns.some((c) => c.name === 'ci_fix_history')) {
        db.exec('ALTER TABLE features ADD COLUMN ci_fix_history TEXT');
      }
    },
  },
  {
    version: 22,
    name: '022-add-pr-notification-filters',
    sql: '',
    handler: (db: Database.Database) => {
      const columns = db.pragma('table_info(settings)') as { name: string }[];
      const add = (col: string) => {
        if (!columns.some((c) => c.name === col)) {
          db.exec(`ALTER TABLE settings ADD COLUMN ${col} INTEGER NOT NULL DEFAULT 1`);
        }
      };
      add('notif_evt_pr_merged');
      add('notif_evt_pr_closed');
      add('notif_evt_pr_checks_passed');
      add('notif_evt_pr_checks_failed');
    },
  },
  {
    version: 23,
    name: '023-backfill-orphaned-repositories',
    sql: `
INSERT OR IGNORE INTO repositories (id, name, path, created_at, updated_at)
SELECT
  lower(hex(randomblob(16))) AS id,
  CASE
    WHEN instr(repository_path, '/') > 0
    THEN replace(repository_path, rtrim(repository_path, replace(repository_path, '/', '')), '')
    ELSE repository_path
  END AS name,
  repository_path AS path,
  strftime('%s', 'now') * 1000 AS created_at,
  strftime('%s', 'now') * 1000 AS updated_at
FROM (
  SELECT DISTINCT repository_path
  FROM features
  WHERE repository_path IS NOT NULL AND repository_path != ''
)
WHERE repository_path NOT IN (SELECT path FROM repositories WHERE path IS NOT NULL);
`,
  },
  {
    version: 24,
    name: '024-add-feature-flags-and-ci-workflow',
    sql: '',
    handler: (db: Database.Database) => {
      const columns = db.pragma('table_info(settings)') as { name: string }[];
      const addNotNull = (col: string, dflt: string) => {
        if (!columns.some((c) => c.name === col)) {
          db.exec(`ALTER TABLE settings ADD COLUMN ${col} INTEGER NOT NULL DEFAULT ${dflt}`);
        }
      };
      const addNullable = (col: string) => {
        if (!columns.some((c) => c.name === col)) {
          db.exec(`ALTER TABLE settings ADD COLUMN ${col} INTEGER`);
        }
      };
      addNotNull('feature_flag_skills', '0');
      addNotNull('feature_flag_env_deploy', '1');
      addNotNull('feature_flag_debug', '0');
      addNullable('ci_max_fix_attempts');
      addNullable('ci_watch_timeout_ms');
      addNullable('ci_log_max_chars');
    },
  },
  {
    version: 25,
    name: '025-add-model-default',
    sql: '',
    handler: (db: Database.Database) => {
      const settingsCols = db.pragma('table_info(settings)') as { name: string }[];
      if (!settingsCols.some((c) => c.name === 'model_default')) {
        db.exec(
          "ALTER TABLE settings ADD COLUMN model_default TEXT NOT NULL DEFAULT 'claude-sonnet-4-6'"
        );
      }
    },
  },
  {
    version: 26,
    name: '026-add-model-id-to-agent-runs',
    sql: '',
    handler: (db: Database.Database) => {
      const columns = db.pragma('table_info(agent_runs)') as { name: string }[];
      if (!columns.some((c) => c.name === 'model_id')) {
        db.exec('ALTER TABLE agent_runs ADD COLUMN model_id TEXT');
      }
    },
  },
  {
    version: 27,
    name: '027-add-fast-column',
    sql: '',
    handler: (db: Database.Database) => {
      const columns = db.pragma('table_info(features)') as { name: string }[];
      if (!columns.some((c) => c.name === 'fast')) {
        db.exec('ALTER TABLE features ADD COLUMN fast INTEGER NOT NULL DEFAULT 0');
      }
    },
  },
  {
    version: 28,
    name: '028-add-attachments',
    sql: '',
    handler: (db: Database.Database) => {
      const columns = db.pragma('table_info(features)') as { name: string }[];
      if (!columns.some((c) => c.name === 'fast')) {
        db.exec('ALTER TABLE features ADD COLUMN fast INTEGER NOT NULL DEFAULT 0');
      }
      if (!columns.some((c) => c.name === 'attachments')) {
        db.exec("ALTER TABLE features ADD COLUMN attachments TEXT NOT NULL DEFAULT '[]'");
      }
    },
  },
  {
    version: 29,
    name: '029-add-feature-soft-delete',
    sql: '',
    handler: (db: Database.Database) => {
      const columns = db.pragma('table_info(features)') as { name: string }[];
      if (!columns.some((c) => c.name === 'deleted_at')) {
        db.exec('ALTER TABLE features ADD COLUMN deleted_at INTEGER');
        db.exec('CREATE INDEX IF NOT EXISTS idx_features_deleted_at ON features(deleted_at)');
      }
    },
  },
  {
    version: 30,
    name: '030-add-evidence-workflow-settings',
    sql: '',
    handler: (db: Database.Database) => {
      const columns = db.pragma('table_info(settings)') as { name: string }[];
      if (!columns.some((c) => c.name === 'workflow_enable_evidence')) {
        db.exec(
          'ALTER TABLE settings ADD COLUMN workflow_enable_evidence INTEGER NOT NULL DEFAULT 0'
        );
      }
      if (!columns.some((c) => c.name === 'workflow_commit_evidence')) {
        db.exec(
          'ALTER TABLE settings ADD COLUMN workflow_commit_evidence INTEGER NOT NULL DEFAULT 0'
        );
      }
    },
  },
  {
    version: 31,
    name: '031-add-pr-mergeable',
    sql: '',
    handler: (db: Database.Database) => {
      const columns = db.pragma('table_info(features)') as { name: string }[];
      if (!columns.some((c) => c.name === 'pr_mergeable')) {
        db.exec('ALTER TABLE features ADD COLUMN pr_mergeable INTEGER');
      }
    },
  },
  {
    version: 32,
    name: '032-update-env-deploy-default',
    sql: `UPDATE settings SET feature_flag_env_deploy = 1 WHERE feature_flag_env_deploy = 0;`,
  },
  {
    version: 33,
    name: '033-create-pr-sync-lock',
    sql: `
CREATE TABLE IF NOT EXISTS pr_sync_lock (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  locked_by TEXT NOT NULL,
  locked_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);
`,
  },
  {
    version: 34,
    name: '034-add-merge-review-notifications',
    sql: '',
    handler: (db: Database.Database) => {
      const columns = db.pragma('table_info(settings)') as { name: string }[];
      const add = (col: string) => {
        if (!columns.some((c) => c.name === col)) {
          db.exec(`ALTER TABLE settings ADD COLUMN ${col} INTEGER NOT NULL DEFAULT 1`);
        }
      };
      add('notif_evt_pr_blocked');
      add('notif_evt_merge_review_ready');
    },
  },
  {
    version: 35,
    name: '035-add-react-file-manager-feature-flag',
    sql: '',
    handler: (db: Database.Database) => {
      const columns = db.pragma('table_info(settings)') as { name: string }[];
      if (!columns.some((c) => c.name === 'feature_flag_react_file_manager')) {
        db.exec(
          'ALTER TABLE settings ADD COLUMN feature_flag_react_file_manager INTEGER NOT NULL DEFAULT 0'
        );
      }
    },
  },
];

/**
 * Transforms a LegacyMigrationDef into an umzug-compatible RunnableMigration.
 *
 * Each migration's up() function:
 *   1. Wraps SQL/handler execution in db.transaction()
 *   2. Sets PRAGMA user_version = N inside the transaction
 */
function toRunnableMigration(def: LegacyMigrationDef): RunnableMigration<Database.Database> {
  return {
    name: def.name,
    async up(params: MigrationParams<Database.Database>): Promise<void> {
      const db = params.context;
      db.transaction(() => {
        if (def.sql) {
          db.exec(def.sql);
        }
        if (def.handler) {
          def.handler(db);
        }
        db.prepare(`PRAGMA user_version = ${def.version}`).run();
      })();
    },
  };
}

/**
 * All 35 legacy migrations as umzug-compatible RunnableMigration objects.
 * Ordered by version number (001–035) for deterministic execution.
 */
export const LEGACY_MIGRATIONS: RunnableMigration<Database.Database>[] =
  MIGRATION_DEFS.map(toRunnableMigration);

/**
 * Ordered list of legacy migration names for use with the bootstrap seeder.
 * E.g., ['001-create-settings-table', '002-add-agent-config', ...]
 */
export const LEGACY_MIGRATION_NAMES: string[] = MIGRATION_DEFS.map((d) => d.name);
