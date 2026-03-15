/**
 * SQLite Migrations Module
 *
 * Manages database schema migrations using umzug v3.
 * Legacy migrations (V1–V34) are registered programmatically from legacy-migrations.ts.
 * New migrations (35+) are individual .ts files in the migrations/ directory,
 * discovered at runtime via directory scan.
 *
 * Preserves the same export API (runSQLiteMigrations, LATEST_SCHEMA_VERSION) so
 * all 16+ importing files require zero changes.
 */

import { readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { Umzug } from 'umzug';
import type { RunnableMigration, MigrationParams } from 'umzug';
import type Database from 'better-sqlite3';
import { SQLiteMigrationStorage } from './sqlite-migration-storage.js';
import { LEGACY_MIGRATIONS, LEGACY_MIGRATION_NAMES } from './legacy-migrations.js';

/**
 * The latest schema version (highest legacy migration version number).
 * Exported for test assertions so they don't hardcode version numbers.
 */
export const LATEST_SCHEMA_VERSION = 34;

/**
 * Resolves the migrations directory path.
 * Works both in source (src/) and compiled (dist/) contexts.
 */
function getMigrationsDir(): string {
  // import.meta.url is available in ESM; fallback to __dirname for CJS
  // The migrations/ directory is a sibling of this file
  return join(dirname(new URL(import.meta.url).pathname), 'migrations');
}

/**
 * Discovers new migration files (035+) in the migrations/ directory.
 * Files must be .js (compiled from .ts) and follow the naming convention:
 *   035-description.js, 036-description.js, etc.
 *
 * Each file must export:
 *   - up(params: MigrationParams<Database.Database>): Promise<void>
 *   - down(params: MigrationParams<Database.Database>): Promise<void> (required for 35+)
 */
async function discoverNewMigrations(
  migrationsDir: string
): Promise<RunnableMigration<Database.Database>[]> {
  let files: string[];
  try {
    const allFiles = readdirSync(migrationsDir);
    // Accept .js (compiled) and .ts (dev via tsx) but exclude .d.ts declaration files
    const candidates = allFiles.filter(
      (f) =>
        (f.endsWith('.js') || f.endsWith('.ts')) && !f.endsWith('.d.ts') && !f.endsWith('.d.js')
    );
    // Deduplicate: if both .ts and .js exist for the same migration, prefer .js
    const byName = new Map<string, string>();
    for (const f of candidates) {
      const base = f.replace(/\.(js|ts)$/, '');
      if (!byName.has(base) || f.endsWith('.js')) {
        byName.set(base, f);
      }
    }
    files = [...byName.values()].sort();
  } catch {
    // Directory doesn't exist or is unreadable — no new migrations
    return [];
  }

  const migrations: RunnableMigration<Database.Database>[] = [];

  for (const file of files) {
    const filePath = join(migrationsDir, file);
    const name = file.replace(/\.(js|ts)$/, '');
    const mod = (await import(pathToFileURL(filePath).href)) as {
      up: (params: MigrationParams<Database.Database>) => Promise<unknown>;
      down?: (params: MigrationParams<Database.Database>) => Promise<unknown>;
    };

    migrations.push({
      name,
      path: filePath,
      up: async (params) => mod.up(params),
      ...(mod.down
        ? { down: async (params: MigrationParams<Database.Database>) => mod.down!(params) }
        : {}),
    });
  }

  return migrations;
}

/**
 * Creates a configured Umzug instance for the given database.
 *
 * Combines legacy inline migrations with runtime-discovered new
 * migration files (035+) from the migrations/ directory.
 */
function createUmzug(db: Database.Database): Umzug<Database.Database> {
  const storage = new SQLiteMigrationStorage(db, LEGACY_MIGRATION_NAMES);
  const migrationsDir = getMigrationsDir();

  return new Umzug<Database.Database>({
    storage,
    context: db,
    migrations: async () => {
      const newMigrations = await discoverNewMigrations(migrationsDir);
      // Legacy migrations first (001–034), then new migrations (035+) sorted by name
      return [...LEGACY_MIGRATIONS, ...newMigrations];
    },
    /* eslint-disable no-console */
    logger: process.env.DEBUG_SQL
      ? {
          info: (msg) => console.log('[umzug:info]', msg),
          warn: (msg) => console.warn('[umzug:warn]', msg),
          error: (msg) => console.error('[umzug:error]', msg),
          debug: (msg) => console.debug('[umzug:debug]', msg),
        }
      : undefined,
    /* eslint-enable no-console */
  });
}

/**
 * Runs all pending database migrations.
 * Safe to call multiple times (idempotent).
 *
 * Internally creates an Umzug instance configured with:
 *   - SQLiteMigrationStorage (custom better-sqlite3 storage adapter)
 *   - 34 legacy inline migrations from legacy-migrations.ts
 *   - Runtime discovery for new migration files (35+)
 *   - Debug-level logger (when DEBUG_SQL is set)
 *
 * @param db - Database instance to run migrations on
 */
export async function runSQLiteMigrations(db: Database.Database): Promise<void> {
  try {
    const umzug = createUmzug(db);
    await umzug.up();
  } catch (error) {
    throw new Error(
      `Failed to run database migrations: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}
