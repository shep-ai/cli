/**
 * Migration 050: Add skill injection config columns to the settings table.
 *
 * Adds two new columns for configuring skill injection during feature creation:
 *  - skill_injection_enabled (INTEGER DEFAULT 0): whether skill injection is active
 *  - skill_injection_skills (TEXT, nullable): JSON array of SkillSource objects
 *
 * Default value of 0 means skill injection is opt-in (disabled by default).
 * Guards against duplicate column errors using table_info pragma.
 */

import type { MigrationParams } from 'umzug';
import type Database from 'better-sqlite3';

export async function up({ context: db }: MigrationParams<Database.Database>): Promise<void> {
  const columns = db.pragma('table_info(settings)') as { name: string }[];
  const names = new Set(columns.map((c) => c.name));

  if (!names.has('skill_injection_enabled')) {
    db.exec('ALTER TABLE settings ADD COLUMN skill_injection_enabled INTEGER NOT NULL DEFAULT 0');
  }

  if (!names.has('skill_injection_skills')) {
    db.exec('ALTER TABLE settings ADD COLUMN skill_injection_skills TEXT');
  }
}

export async function down({ context: db }: MigrationParams<Database.Database>): Promise<void> {
  void db;
}
