/**
 * SQLite Connection Module
 *
 * Provides singleton database connection to ~/.shep/data
 * Configures pragmas for optimal performance and reliability.
 */

import Database from 'better-sqlite3';
import {
  ensureShepDirectory,
  getShepDbPath,
} from '../../services/filesystem/shep-directory.service.js';

/**
 * Singleton database instance.
 * Initialized on first call to getSQLiteConnection().
 */
let dbInstance: Database.Database | null = null;

/**
 * Gets or creates the SQLite database connection.
 * Singleton pattern ensures only one connection exists.
 *
 * On first call:
 * - Ensures ~/.shep/ directory exists
 * - Creates database file at ~/.shep/data
 * - Configures pragmas for performance and reliability
 *
 * @returns Database connection instance
 *
 * @example
 * ```typescript
 * const db = await getSQLiteConnection();
 * const settings = db.prepare('SELECT * FROM settings').get();
 * ```
 */
export async function getSQLiteConnection(): Promise<Database.Database> {
  if (dbInstance) {
    return dbInstance;
  }

  // Ensure ~/.shep/ directory exists
  await ensureShepDirectory();

  // Get database path
  const dbPath = getShepDbPath();

  // Create database connection
  dbInstance = new Database(dbPath, {
    // eslint-disable-next-line no-console
    verbose: process.env.DEBUG_SQL ? console.log : undefined,
  });

  // Configure pragmas for production use
  // WAL mode: Better concurrency, write performance
  dbInstance.pragma('journal_mode = WAL');

  // NORMAL synchronous: Balance between safety and performance
  dbInstance.pragma('synchronous = NORMAL');

  // Enable foreign keys
  dbInstance.pragma('foreign_keys = ON');

  // Defensive mode: Additional safety checks
  dbInstance.pragma('defensive = ON');

  // Cache size: 2000 pages (~8MB with 4KB page size)
  dbInstance.pragma('cache_size = -2000');

  return dbInstance;
}

/**
 * Closes the database connection.
 * Should be called when application exits.
 * Safe to call multiple times.
 */
export function closeSQLiteConnection(): void {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}

/**
 * Gets the current database instance without creating one.
 * Returns null if connection hasn't been established yet.
 *
 * @returns Database instance or null
 */
export function getExistingConnection(): Database.Database | null {
  return dbInstance;
}
