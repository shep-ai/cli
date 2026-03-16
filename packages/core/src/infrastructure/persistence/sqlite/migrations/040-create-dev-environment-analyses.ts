/**
 * Migration 040: Create dev_environment_analyses table.
 *
 * Stores cached analysis results for repository dev environments.
 * Keyed by cache_key (git remote URL or root repo absolute path)
 * so all worktrees of the same repo share one cache entry.
 */

import type { MigrationParams } from 'umzug';
import type Database from 'better-sqlite3';

export async function up({ context: db }: MigrationParams<Database.Database>): Promise<void> {
  const tables = db
    .prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='dev_environment_analyses'"
    )
    .get();

  if (!tables) {
    db.exec(`
      CREATE TABLE dev_environment_analyses (
        id TEXT PRIMARY KEY NOT NULL,
        cache_key TEXT NOT NULL UNIQUE,
        can_start INTEGER NOT NULL,
        reason TEXT,
        commands TEXT NOT NULL,
        prerequisites TEXT,
        ports TEXT,
        environment_variables TEXT,
        language TEXT NOT NULL,
        framework TEXT,
        source TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )
    `);
  }
}

export async function down({ context: db }: MigrationParams<Database.Database>): Promise<void> {
  void db;
}
