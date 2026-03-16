/**
 * Migration 038: Add execution metadata columns to phase_timings table.
 *
 * Extends phase_timings to capture full execution context for each agent
 * graph node: prompt, model, agent type, token usage, and outcome.
 */

import type { MigrationParams } from 'umzug';
import type Database from 'better-sqlite3';

const COLUMNS: [string, string][] = [
  ['prompt', 'TEXT'],
  ['model_id', 'TEXT'],
  ['agent_type', 'TEXT'],
  ['input_tokens', 'INTEGER'],
  ['output_tokens', 'INTEGER'],
  ['exit_code', 'TEXT'],
  ['error_message', 'TEXT'],
];

export async function up({ context: db }: MigrationParams<Database.Database>): Promise<void> {
  const columns = db.pragma('table_info(phase_timings)') as { name: string }[];
  const existing = new Set(columns.map((c) => c.name));

  for (const [col, type] of COLUMNS) {
    if (!existing.has(col)) {
      db.exec(`ALTER TABLE phase_timings ADD COLUMN ${col} ${type}`);
    }
  }
}

export async function down({ context: db }: MigrationParams<Database.Database>): Promise<void> {
  void db;
}
