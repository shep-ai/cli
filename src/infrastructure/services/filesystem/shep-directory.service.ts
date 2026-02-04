/**
 * Shep Directory Service
 *
 * Manages the ~/.shep/ directory for global settings and data storage.
 * Ensures directory exists with correct permissions before database operations.
 */

import { mkdir } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { existsSync } from 'node:fs';

/**
 * The root directory for Shep AI CLI data.
 * Located at ~/.shep/ in the user's home directory.
 */
export const SHEP_HOME_DIR = join(homedir(), '.shep');

/**
 * The path to the SQLite database file.
 * Located at ~/.shep/data
 */
export const SHEP_DB_PATH = join(SHEP_HOME_DIR, 'data');

/**
 * Ensures the ~/.shep/ directory exists with correct permissions.
 * Creates the directory if it doesn't exist.
 * Safe to call multiple times (idempotent).
 *
 * Permissions: 700 (rwx------) - only owner can read/write/execute
 *
 * @throws Error if directory cannot be created (permissions, disk space, etc.)
 */
export async function ensureShepDirectory(): Promise<void> {
  // Check if directory already exists
  if (existsSync(SHEP_HOME_DIR)) {
    return;
  }

  try {
    // Create directory with 700 permissions (owner read/write/execute only)
    await mkdir(SHEP_HOME_DIR, {
      recursive: true,
      mode: 0o700,
    });
  } catch (error) {
    // Provide helpful error message
    throw new Error(
      `Failed to create Shep directory at ${SHEP_HOME_DIR}: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Gets the path to the Shep home directory.
 * Does not create the directory.
 *
 * @returns Path to ~/.shep/
 */
export function getShepHomeDir(): string {
  return SHEP_HOME_DIR;
}

/**
 * Gets the path to the SQLite database file.
 * Does not create the file or directory.
 *
 * @returns Path to ~/.shep/data
 */
export function getShepDbPath(): string {
  return SHEP_DB_PATH;
}
