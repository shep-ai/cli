/**
 * Migration 035: Add per-stage timeout columns to settings table.
 *
 * Replaces the single stage_timeout_ms column with individual per-stage
 * timeout columns. Each is a nullable INTEGER (milliseconds). When NULL,
 * the application falls back to the hardcoded default of 600_000 ms
 * (10 minutes).
 *
 * Columns added:
 *  - stage_timeout_analyze_ms
 *  - stage_timeout_requirements_ms
 *  - stage_timeout_research_ms
 *  - stage_timeout_plan_ms
 *  - stage_timeout_implement_ms
 *  - stage_timeout_merge_ms
 *  - analyze_repo_timeout_analyze_ms
 */

import type { MigrationParams } from 'umzug';
import type Database from 'better-sqlite3';

const STAGE_COLUMNS = [
  'stage_timeout_analyze_ms',
  'stage_timeout_requirements_ms',
  'stage_timeout_research_ms',
  'stage_timeout_plan_ms',
  'stage_timeout_implement_ms',
  'stage_timeout_merge_ms',
  'analyze_repo_timeout_analyze_ms',
] as const;

export async function up({ context: db }: MigrationParams<Database.Database>): Promise<void> {
  const columns = db.pragma('table_info(settings)') as { name: string }[];
  const existingNames = new Set(columns.map((c) => c.name));

  for (const col of STAGE_COLUMNS) {
    if (!existingNames.has(col)) {
      db.exec(`ALTER TABLE settings ADD COLUMN ${col} INTEGER`);
    }
  }

  // Migrate existing stage_timeout_ms value to all per-stage columns
  if (existingNames.has('stage_timeout_ms')) {
    db.exec(`
      UPDATE settings SET
        stage_timeout_analyze_ms = COALESCE(stage_timeout_analyze_ms, stage_timeout_ms),
        stage_timeout_requirements_ms = COALESCE(stage_timeout_requirements_ms, stage_timeout_ms),
        stage_timeout_research_ms = COALESCE(stage_timeout_research_ms, stage_timeout_ms),
        stage_timeout_plan_ms = COALESCE(stage_timeout_plan_ms, stage_timeout_ms),
        stage_timeout_implement_ms = COALESCE(stage_timeout_implement_ms, stage_timeout_ms),
        stage_timeout_merge_ms = COALESCE(stage_timeout_merge_ms, stage_timeout_ms)
      WHERE stage_timeout_ms IS NOT NULL
    `);
  }
}

export async function down({ context: db }: MigrationParams<Database.Database>): Promise<void> {
  // SQLite does not support DROP COLUMN before 3.35.0; the columns are
  // nullable and ignored when absent, so this is a no-op.
  void db;
}
