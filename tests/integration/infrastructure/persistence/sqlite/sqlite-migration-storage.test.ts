/**
 * SQLiteMigrationStorage Integration Tests
 *
 * Tests for the custom umzug storage adapter that wraps better-sqlite3's
 * synchronous API for umzug's async interface.
 *
 * TDD Phase: RED → GREEN
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type Database from 'better-sqlite3';
import { createInMemoryDatabase } from '../../../../helpers/database.helper.js';
import { SQLiteMigrationStorage } from '@/infrastructure/persistence/sqlite/sqlite-migration-storage.js';

/** Sample legacy migration names for testing bootstrap seeder. */
const SAMPLE_LEGACY_NAMES = [
  '001-create-settings-table',
  '002-add-agent-config',
  '003-create-agent-runs',
  '004-create-features',
  '005-add-feature-refs-to-agent-runs',
];

describe('SQLiteMigrationStorage', () => {
  let db: Database.Database;
  let storage: SQLiteMigrationStorage;

  beforeEach(() => {
    db = createInMemoryDatabase();
    storage = new SQLiteMigrationStorage(db);
  });

  afterEach(() => {
    db.close();
  });

  describe('constructor', () => {
    it('should create umzug_migrations table if not exists', () => {
      const result = db
        .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='umzug_migrations'")
        .get();
      expect(result).toBeDefined();
    });

    it('should be idempotent — calling constructor twice does not error', () => {
      expect(() => new SQLiteMigrationStorage(db)).not.toThrow();

      // Table should still exist with correct structure
      const result = db
        .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='umzug_migrations'")
        .get();
      expect(result).toBeDefined();
    });
  });

  describe('executed()', () => {
    it('should return empty array on fresh database', async () => {
      const result = await storage.executed({ context: db });
      expect(result).toEqual([]);
    });

    it('should return logged migration names in order', async () => {
      await storage.logMigration({ name: '002-add-agent-config', context: db });
      await storage.logMigration({
        name: '001-create-settings-table',
        context: db,
      });

      const result = await storage.executed({ context: db });
      expect(result).toEqual(['001-create-settings-table', '002-add-agent-config']);
    });
  });

  describe('logMigration()', () => {
    it('should record a migration name and created_at', async () => {
      await storage.logMigration({
        name: '001-create-settings-table',
        context: db,
      });

      const row = db
        .prepare('SELECT name, created_at FROM umzug_migrations WHERE name = ?')
        .get('001-create-settings-table') as {
        name: string;
        created_at: string;
      };

      expect(row).toBeDefined();
      expect(row.name).toBe('001-create-settings-table');
      expect(row.created_at).toBeTruthy();
      // Verify created_at is a valid ISO-ish timestamp
      expect(new Date(row.created_at).getTime()).not.toBeNaN();
    });

    it('should allow logging multiple migrations', async () => {
      await storage.logMigration({
        name: '001-create-settings-table',
        context: db,
      });
      await storage.logMigration({ name: '002-add-agent-config', context: db });

      const count = db.prepare('SELECT COUNT(*) as count FROM umzug_migrations').get() as {
        count: number;
      };
      expect(count.count).toBe(2);
    });
  });

  describe('unlogMigration()', () => {
    it('should remove the specified migration record', async () => {
      await storage.logMigration({
        name: '001-create-settings-table',
        context: db,
      });
      await storage.logMigration({ name: '002-add-agent-config', context: db });

      await storage.unlogMigration({
        name: '001-create-settings-table',
        context: db,
      });

      const result = await storage.executed({ context: db });
      expect(result).toEqual(['002-add-agent-config']);
    });

    it('should not error when removing a non-existent migration', async () => {
      await expect(
        storage.unlogMigration({ name: 'non-existent', context: db })
      ).resolves.not.toThrow();
    });
  });

  describe('table schema', () => {
    it('should have name as TEXT PRIMARY KEY', () => {
      const columns = db.pragma('table_info(umzug_migrations)') as {
        name: string;
        type: string;
        pk: number;
      }[];

      const nameCol = columns.find((c) => c.name === 'name');
      expect(nameCol).toBeDefined();
      expect(nameCol!.type).toBe('TEXT');
      expect(nameCol!.pk).toBe(1);
    });

    it('should have created_at as TEXT NOT NULL', () => {
      const columns = db.pragma('table_info(umzug_migrations)') as {
        name: string;
        type: string;
        notnull: number;
      }[];

      const createdAtCol = columns.find((c) => c.name === 'created_at');
      expect(createdAtCol).toBeDefined();
      expect(createdAtCol!.type).toBe('TEXT');
      expect(createdAtCol!.notnull).toBe(1);
    });
  });

  describe('bootstrap seeder', () => {
    it('should seed records when user_version > 0 and table is empty', () => {
      // Simulate an existing database with user_version = 5
      db.pragma('user_version = 5');

      // Create a new storage with legacy names — bootstrap should detect and seed
      const seededStorage = new SQLiteMigrationStorage(db, SAMPLE_LEGACY_NAMES);

      // Verify all 5 records were seeded
      const rows = db.prepare('SELECT name FROM umzug_migrations ORDER BY name').all() as {
        name: string;
      }[];
      expect(rows.map((r) => r.name)).toEqual([
        '001-create-settings-table',
        '002-add-agent-config',
        '003-create-agent-runs',
        '004-create-features',
        '005-add-feature-refs-to-agent-runs',
      ]);

      // executed() should return the seeded names
      return seededStorage
        .executed({ context: db })
        .then((result) => expect(result).toEqual(rows.map((r) => r.name)));
    });

    it('should not seed when umzug_migrations already has records', async () => {
      // Log a migration first
      await storage.logMigration({
        name: '001-create-settings-table',
        context: db,
      });

      // Set user_version to simulate an existing database
      db.pragma('user_version = 5');

      // Create a new storage — bootstrap should NOT seed because table has records
      new SQLiteMigrationStorage(db, SAMPLE_LEGACY_NAMES);

      // Should still only have the one record we manually logged
      const count = db.prepare('SELECT COUNT(*) as count FROM umzug_migrations').get() as {
        count: number;
      };
      expect(count.count).toBe(1);
    });

    it('should not seed on fresh database (user_version = 0)', () => {
      // user_version is 0 by default on fresh databases
      expect(
        (db.prepare('PRAGMA user_version').get() as { user_version: number }).user_version
      ).toBe(0);

      // Create storage with legacy names — should NOT seed
      new SQLiteMigrationStorage(db, SAMPLE_LEGACY_NAMES);

      const count = db.prepare('SELECT COUNT(*) as count FROM umzug_migrations').get() as {
        count: number;
      };
      expect(count.count).toBe(0);
    });

    it('should seed correct number of records matching user_version', () => {
      // Simulate database at version 3 (out of 5 available)
      db.pragma('user_version = 3');

      new SQLiteMigrationStorage(db, SAMPLE_LEGACY_NAMES);

      const rows = db.prepare('SELECT name FROM umzug_migrations ORDER BY name').all() as {
        name: string;
      }[];
      expect(rows).toHaveLength(3);
      expect(rows.map((r) => r.name)).toEqual([
        '001-create-settings-table',
        '002-add-agent-config',
        '003-create-agent-runs',
      ]);
    });

    it('should seed records with valid created_at timestamps', () => {
      db.pragma('user_version = 2');

      new SQLiteMigrationStorage(db, SAMPLE_LEGACY_NAMES);

      const rows = db.prepare('SELECT created_at FROM umzug_migrations').all() as {
        created_at: string;
      }[];
      for (const row of rows) {
        expect(new Date(row.created_at).getTime()).not.toBeNaN();
      }
    });

    it('should be idempotent — calling constructor twice does not duplicate records', () => {
      db.pragma('user_version = 3');

      new SQLiteMigrationStorage(db, SAMPLE_LEGACY_NAMES);
      // Second construction — should not add duplicate records
      new SQLiteMigrationStorage(db, SAMPLE_LEGACY_NAMES);

      const count = db.prepare('SELECT COUNT(*) as count FROM umzug_migrations').get() as {
        count: number;
      };
      expect(count.count).toBe(3);
    });

    it('should not run bootstrap when no legacy names are provided', () => {
      db.pragma('user_version = 5');

      // No legacy names passed — bootstrap cannot seed
      new SQLiteMigrationStorage(db);

      const count = db.prepare('SELECT COUNT(*) as count FROM umzug_migrations').get() as {
        count: number;
      };
      expect(count.count).toBe(0);
    });
  });
});
