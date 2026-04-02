/**
 * Migration 051: Add usage tracking columns to interactive_sessions.
 *
 * Tracks cumulative cost and token usage per session so users can see
 * how much each chat session costs. Values are accumulated from the
 * SDK's result messages on each turn completion.
 *
 * Columns:
 *  - total_cost_usd: cumulative cost in USD (REAL, default 0)
 *  - total_input_tokens: cumulative input tokens (INTEGER, default 0)
 *  - total_output_tokens: cumulative output tokens (INTEGER, default 0)
 *  - total_turns: cumulative SDK turns (INTEGER, default 0)
 */

import type { MigrationParams } from 'umzug';
import type Database from 'better-sqlite3';

export async function up({ context: db }: MigrationParams<Database.Database>): Promise<void> {
  const columns = db.pragma('table_info(interactive_sessions)') as { name: string }[];
  const names = new Set(columns.map((c) => c.name));

  if (!names.has('total_cost_usd')) {
    db.exec('ALTER TABLE interactive_sessions ADD COLUMN total_cost_usd REAL NOT NULL DEFAULT 0');
  }
  if (!names.has('total_input_tokens')) {
    db.exec(
      'ALTER TABLE interactive_sessions ADD COLUMN total_input_tokens INTEGER NOT NULL DEFAULT 0'
    );
  }
  if (!names.has('total_output_tokens')) {
    db.exec(
      'ALTER TABLE interactive_sessions ADD COLUMN total_output_tokens INTEGER NOT NULL DEFAULT 0'
    );
  }
  if (!names.has('total_turns')) {
    db.exec('ALTER TABLE interactive_sessions ADD COLUMN total_turns INTEGER NOT NULL DEFAULT 0');
  }
}

export async function down({ context: db }: MigrationParams<Database.Database>): Promise<void> {
  void db;
}
