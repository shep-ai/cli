/**
 * Migration 049: Add Telegram remote control settings columns to the settings table.
 *
 * Adds columns for the Telegram Bot integration configuration:
 *  - telegram_enabled (INTEGER DEFAULT 0): whether Telegram integration is active
 *  - telegram_bot_token (TEXT): Bot API token from @BotFather
 *  - telegram_chat_id (TEXT): Paired chat ID
 *  - telegram_notify_* (INTEGER DEFAULT 0/1): per-event-type notification filters
 *
 * Default values are applied via column defaults so no existing rows need updating.
 * Guards against duplicate column errors using table_info pragma.
 */

import type { MigrationParams } from 'umzug';
import type Database from 'better-sqlite3';

const COLUMNS: { name: string; sql: string }[] = [
  { name: 'telegram_enabled', sql: 'INTEGER NOT NULL DEFAULT 0' },
  { name: 'telegram_bot_token', sql: 'TEXT' },
  { name: 'telegram_chat_id', sql: 'TEXT' },
  { name: 'telegram_notify_agent_started', sql: 'INTEGER NOT NULL DEFAULT 0' },
  { name: 'telegram_notify_phase_completed', sql: 'INTEGER NOT NULL DEFAULT 0' },
  { name: 'telegram_notify_waiting_approval', sql: 'INTEGER NOT NULL DEFAULT 1' },
  { name: 'telegram_notify_agent_completed', sql: 'INTEGER NOT NULL DEFAULT 1' },
  { name: 'telegram_notify_agent_failed', sql: 'INTEGER NOT NULL DEFAULT 1' },
  { name: 'telegram_notify_pr_merged', sql: 'INTEGER NOT NULL DEFAULT 1' },
  { name: 'telegram_notify_pr_closed', sql: 'INTEGER NOT NULL DEFAULT 0' },
  { name: 'telegram_notify_pr_checks_passed', sql: 'INTEGER NOT NULL DEFAULT 0' },
  { name: 'telegram_notify_pr_checks_failed', sql: 'INTEGER NOT NULL DEFAULT 1' },
  { name: 'telegram_notify_pr_blocked', sql: 'INTEGER NOT NULL DEFAULT 1' },
  { name: 'telegram_notify_merge_review_ready', sql: 'INTEGER NOT NULL DEFAULT 1' },
];

export async function up({ context: db }: MigrationParams<Database.Database>): Promise<void> {
  const columns = db.pragma('table_info(settings)') as { name: string }[];
  const existing = new Set(columns.map((c) => c.name));

  for (const col of COLUMNS) {
    if (!existing.has(col.name)) {
      db.exec(`ALTER TABLE settings ADD COLUMN ${col.name} ${col.sql}`);
    }
  }
}

export async function down({ context: db }: MigrationParams<Database.Database>): Promise<void> {
  void db;
}
