/**
 * Migration 039: Add extended execution stats to phase_timings table.
 *
 * Adds cache token breakdown, cost, turn count, and API duration
 * to capture rich telemetry from agent CLI output.
 */

import type { MigrationParams } from 'umzug';
import type Database from 'better-sqlite3';

const COLUMNS: [string, string][] = [
  ['cache_creation_input_tokens', 'INTEGER'],
  ['cache_read_input_tokens', 'INTEGER'],
  ['cost_usd', 'REAL'],
  ['num_turns', 'INTEGER'],
  ['duration_api_ms', 'INTEGER'],
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
