/**
 * SQLite Migrations Module
 *
 * Manages database schema migrations using a simple manual approach.
 * Migrations are SQL files in migrations/ directory, numbered sequentially.
 *
 * Migration Files:
 * - 001_create_settings_table.sql
 * - 002_add_feature_table.sql
 * - etc.
 *
 * Tracks applied migrations using user_version pragma.
 */

import type Database from 'better-sqlite3';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// Get current directory for __dirname equivalent in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Directory containing migration SQL files.
 */
const MIGRATIONS_DIR = join(__dirname, 'migrations');

/**
 * Migration definition.
 */
interface Migration {
  version: number;
  filename: string;
}

/**
 * List of all migrations in order.
 */
const MIGRATIONS: Migration[] = [{ version: 1, filename: '001_create_settings_table.sql' }];

/**
 * Runs all pending database migrations.
 * Safe to call multiple times (idempotent).
 *
 * Migrations are loaded from migrations/ directory and applied in order.
 * The user_version pragma tracks which migrations have been applied.
 *
 * @param db - Database instance to run migrations on
 *
 * @example
 * ```typescript
 * const db = await getSQLiteConnection();
 * await runSQLiteMigrations(db);
 * ```
 */
export async function runSQLiteMigrations(db: Database.Database): Promise<void> {
  try {
    // Get current schema version
    const result = db.prepare('PRAGMA user_version').get() as {
      user_version: number;
    };
    const currentVersion = result.user_version;

    // Run each pending migration
    for (const migration of MIGRATIONS) {
      if (migration.version > currentVersion) {
        // Load migration SQL
        const sql = readFileSync(join(MIGRATIONS_DIR, migration.filename), 'utf-8');

        // Execute migration in a transaction
        db.transaction(() => {
          // Run migration SQL (using better-sqlite3's exec method, not child_process)
          db.exec(sql);

          // Update user_version
          db.prepare(`PRAGMA user_version = ${migration.version}`).run();
        })();
      }
    }
  } catch (error) {
    throw new Error(
      `Failed to run database migrations: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}
