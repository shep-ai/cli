/**
 * Database Test Helper
 *
 * Provides utilities for creating and managing in-memory SQLite databases
 * for integration tests. Ensures tests are isolated and fast.
 */

import Database from 'better-sqlite3';

/**
 * Creates an in-memory SQLite database for testing.
 * Database is destroyed when the connection is closed.
 *
 * @returns In-memory database instance
 *
 * @example
 * ```typescript
 * const db = createInMemoryDatabase();
 * // Use db for testing
 * db.close();
 * ```
 */
export function createInMemoryDatabase(): Database.Database {
  const db = new Database(':memory:', {
    verbose: process.env.DEBUG_SQL ? console.log : undefined,
  });

  // Set pragmas for testing (same as production but optimized for testing)
  db.pragma('journal_mode = MEMORY'); // Faster than WAL for in-memory
  db.pragma('synchronous = OFF'); // Faster for tests (no disk writes)
  db.pragma('foreign_keys = ON');
  db.pragma('temp_store = MEMORY');

  return db;
}

/**
 * Creates an in-memory database with migrations applied.
 * Useful for integration tests that need a fully initialized schema.
 *
 * @param runMigrations - Function to run migrations
 * @returns Database with migrations applied
 *
 * @example
 * ```typescript
 * const db = await createDatabaseWithMigrations(runSQLiteMigrations);
 * // Database has complete schema
 * db.close();
 * ```
 */
export async function createDatabaseWithMigrations(
  runMigrations: (db: Database.Database) => Promise<void>
): Promise<Database.Database> {
  const db = createInMemoryDatabase();
  await runMigrations(db);
  return db;
}

/**
 * Verifies that a table exists in the database.
 *
 * @param db - Database instance
 * @param tableName - Name of the table to check
 * @returns True if table exists, false otherwise
 */
export function tableExists(db: Database.Database, tableName: string): boolean {
  const result = db
    .prepare(
      `
    SELECT name
    FROM sqlite_master
    WHERE type='table' AND name=?
  `
    )
    .get(tableName);
  return result !== undefined;
}

/**
 * Gets the current schema version from user_version pragma.
 *
 * @param db - Database instance
 * @returns Current schema version
 */
export function getSchemaVersion(db: Database.Database): number {
  const result = db.prepare('PRAGMA user_version').get() as {
    user_version: number;
  };
  return result.user_version;
}

/**
 * Gets table schema information.
 *
 * @param db - Database instance
 * @param tableName - Name of the table
 * @returns Array of column definitions
 */
export function getTableSchema(
  db: Database.Database,
  tableName: string
): { name: string; type: string; notnull: number; dflt_value: string | null; pk: number }[] {
  return db.prepare(`PRAGMA table_info(${tableName})`).all() as {
    name: string;
    type: string;
    notnull: number;
    dflt_value: string | null;
    pk: number;
  }[];
}

/**
 * Gets all indexes for a table.
 *
 * @param db - Database instance
 * @param tableName - Name of the table
 * @returns Array of index names
 */
export function getTableIndexes(db: Database.Database, tableName: string): string[] {
  const results = db
    .prepare(
      `
    SELECT name
    FROM sqlite_master
    WHERE type='index' AND tbl_name=?
  `
    )
    .all(tableName) as { name: string }[];
  return results.map((r) => r.name);
}
