/**
 * Migration 049: Add user_preferred_language column to settings.
 *
 * Stores the user's preferred UI language as an ISO 639-1 code.
 * Defaults to 'en' (English) for backward compatibility with
 * existing installations.
 *
 * Supported values: en, ru, pt, es, ar, he, fr, de
 */

import type { MigrationParams } from 'umzug';
import type Database from 'better-sqlite3';

export async function up({ context: db }: MigrationParams<Database.Database>): Promise<void> {
  const columns = db.pragma('table_info(settings)') as { name: string }[];
  const names = new Set(columns.map((c) => c.name));

  if (!names.has('user_preferred_language')) {
    db.exec(`ALTER TABLE settings ADD COLUMN user_preferred_language TEXT NOT NULL DEFAULT 'en'`);
  }
}

export async function down({ context: db }: MigrationParams<Database.Database>): Promise<void> {
  void db;
}
