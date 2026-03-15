/**
 * Custom umzug storage adapter for better-sqlite3.
 *
 * Wraps better-sqlite3's synchronous API in async methods to satisfy
 * umzug's UmzugStorage interface. Manages the `umzug_migrations` tracking
 * table with columns: name (TEXT PK) and created_at (TEXT NOT NULL).
 *
 * Includes a bootstrap seeder that auto-detects existing databases
 * (PRAGMA user_version > 0 with empty umzug_migrations table) and seeds
 * migration records for versions 1 through user_version.
 */

import type Database from 'better-sqlite3';
import type { UmzugStorage, MigrationParams } from 'umzug';

/**
 * SQLite-backed migration storage for umzug.
 *
 * Tracks which migrations have been applied in a `umzug_migrations` table
 * within the same SQLite database as the application data.
 */
export class SQLiteMigrationStorage implements UmzugStorage<Database.Database> {
  private readonly db: Database.Database;

  /**
   * @param db - The better-sqlite3 database instance.
   * @param legacyMigrationNames - Ordered list of legacy migration names (e.g.,
   *   ['001-create-settings-table', '002-add-agent-config', ...]). When provided,
   *   the constructor checks if this is an existing database transitioning from
   *   PRAGMA user_version tracking and seeds the umzug_migrations table accordingly.
   */
  constructor(db: Database.Database, legacyMigrationNames?: string[]) {
    this.db = db;
    this.ensureTable();
    if (legacyMigrationNames && legacyMigrationNames.length > 0) {
      this.bootstrapLegacyMigrations(legacyMigrationNames);
    }
  }

  /**
   * Mapping of legacy migration names to the tables they create.
   * Used by verifyBootstrappedMigrations to detect migrations that were
   * marked as executed by the bootstrap seeder but never actually ran.
   */
  private static readonly MIGRATION_TABLE_MAP: Record<string, string> = {
    '001-create-settings-table': 'settings',
    '003-create-agent-runs': 'agent_runs',
    '004-create-features': 'features',
    '008-add-approval-gates-and-phase-timings': 'phase_timings',
    '015-create-repositories-and-backfill': 'repositories',
    '033-create-pr-sync-lock': 'pr_sync_lock',
  };

  /**
   * Returns the names of all executed migrations, sorted lexicographically.
   */
  async executed(_meta: Pick<MigrationParams<Database.Database>, 'context'>): Promise<string[]> {
    const rows = this.db.prepare('SELECT name FROM umzug_migrations ORDER BY name').all() as {
      name: string;
    }[];
    return rows.map((r) => r.name);
  }

  /**
   * Records a migration as executed.
   */
  async logMigration(params: MigrationParams<Database.Database>): Promise<void> {
    this.db
      .prepare('INSERT INTO umzug_migrations (name, created_at) VALUES (?, ?)')
      .run(params.name, new Date().toISOString());
  }

  /**
   * Removes a migration record (marks it as pending).
   */
  async unlogMigration(params: MigrationParams<Database.Database>): Promise<void> {
    this.db.prepare('DELETE FROM umzug_migrations WHERE name = ?').run(params.name);
  }

  /**
   * Creates the umzug_migrations table if it does not exist.
   */
  private ensureTable(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS umzug_migrations (
        name TEXT PRIMARY KEY NOT NULL,
        created_at TEXT NOT NULL
      )
    `);
  }

  /**
   * Auto-detects existing databases that used PRAGMA user_version tracking
   * and seeds the umzug_migrations table so umzug does not re-apply them.
   *
   * Conditions for bootstrap:
   * - PRAGMA user_version > 0 (database has been migrated before)
   * - umzug_migrations table is empty (not yet transitioned to umzug)
   *
   * When both conditions are met, inserts records for migrations 1 through
   * user_version using the provided legacy migration names.
   */
  private bootstrapLegacyMigrations(legacyMigrationNames: string[]): void {
    const result = this.db.prepare('PRAGMA user_version').get() as {
      user_version: number;
    };
    const userVersion = result.user_version;

    if (userVersion <= 0) {
      return;
    }

    const count = this.db.prepare('SELECT COUNT(*) as count FROM umzug_migrations').get() as {
      count: number;
    };

    if (count.count > 0) {
      return;
    }

    // Seed records for migrations 1 through user_version
    const now = new Date().toISOString();
    const insert = this.db.prepare('INSERT INTO umzug_migrations (name, created_at) VALUES (?, ?)');

    const seedAll = this.db.transaction(() => {
      const count = Math.min(userVersion, legacyMigrationNames.length);
      for (let i = 0; i < count; i++) {
        insert.run(legacyMigrationNames[i], now);
      }
    });

    seedAll();

    // After seeding, verify that expected schema artifacts actually exist.
    // If a migration was inserted into the legacy list after the DB was already
    // at a higher user_version, its DDL never ran but the seeder marked it done.
    const seededCount = Math.min(userVersion, legacyMigrationNames.length);
    const seededNames = legacyMigrationNames.slice(0, seededCount);
    this.verifyBootstrappedMigrations(seededNames);
  }

  /**
   * Checks that each bootstrapped migration's expected table actually exists.
   * Only checks migrations that were seeded (present in seededNames).
   * If a table is missing, removes the migration record from umzug_migrations
   * so that umzug will re-run it on the next up() call.
   */
  private verifyBootstrappedMigrations(seededNames: string[]): void {
    const seededSet = new Set(seededNames);
    const tableCheck = this.db.prepare(
      "SELECT COUNT(*) as count FROM sqlite_master WHERE type='table' AND name=?"
    );

    for (const [migrationName, tableName] of Object.entries(
      SQLiteMigrationStorage.MIGRATION_TABLE_MAP
    )) {
      if (!seededSet.has(migrationName)) continue;

      const result = tableCheck.get(tableName) as { count: number };
      if (result.count === 0) {
        this.db.prepare('DELETE FROM umzug_migrations WHERE name = ?').run(migrationName);
      }
    }
  }
}
