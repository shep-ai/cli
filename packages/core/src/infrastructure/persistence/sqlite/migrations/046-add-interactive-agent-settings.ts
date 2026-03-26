/**
 * Migration 046: Add interactive agent settings columns to the settings table.
 *
 * Adds three new columns for the per-feature interactive chat agent configuration:
 *  - interactive_agent_enabled (INTEGER DEFAULT 1): whether the Chat tab is shown
 *  - interactive_agent_auto_timeout_minutes (INTEGER DEFAULT 15): idle timeout in minutes
 *  - interactive_agent_max_concurrent_sessions (INTEGER DEFAULT 3): session cap
 *
 * Default values are applied via column defaults so no existing rows need updating.
 * Guards against duplicate column errors using table_info pragma.
 */

import type { MigrationParams } from 'umzug';
import type Database from 'better-sqlite3';

export async function up({ context: db }: MigrationParams<Database.Database>): Promise<void> {
  const columns = db.pragma('table_info(settings)') as { name: string }[];
  const names = new Set(columns.map((c) => c.name));

  if (!names.has('interactive_agent_enabled')) {
    db.exec('ALTER TABLE settings ADD COLUMN interactive_agent_enabled INTEGER NOT NULL DEFAULT 1');
  }
  if (!names.has('interactive_agent_auto_timeout_minutes')) {
    db.exec(
      'ALTER TABLE settings ADD COLUMN interactive_agent_auto_timeout_minutes INTEGER NOT NULL DEFAULT 15'
    );
  }
  if (!names.has('interactive_agent_max_concurrent_sessions')) {
    db.exec(
      'ALTER TABLE settings ADD COLUMN interactive_agent_max_concurrent_sessions INTEGER NOT NULL DEFAULT 3'
    );
  }
}

export async function down({ context: db }: MigrationParams<Database.Database>): Promise<void> {
  void db;
}
