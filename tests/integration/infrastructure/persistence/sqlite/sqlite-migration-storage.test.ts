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
      // Create the tables that migrations 001/003/004 would have created
      db.exec('CREATE TABLE settings (id TEXT PRIMARY KEY)');
      db.exec('CREATE TABLE agent_runs (id TEXT PRIMARY KEY)');
      db.exec('CREATE TABLE features (id TEXT PRIMARY KEY)');
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
      // Create tables that migrations 001/003 would have created
      db.exec('CREATE TABLE settings (id TEXT PRIMARY KEY)');
      db.exec('CREATE TABLE agent_runs (id TEXT PRIMARY KEY)');
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
      // Create tables that migrations 001/003 would have created
      db.exec('CREATE TABLE settings (id TEXT PRIMARY KEY)');
      db.exec('CREATE TABLE agent_runs (id TEXT PRIMARY KEY)');
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

  describe('bootstrap schema verification', () => {
    /**
     * Full list of legacy migration names matching production (001–034).
     * Needed so the bootstrap seeder can seed all 34 records.
     */
    const ALL_LEGACY_NAMES = [
      '001-create-settings-table',
      '002-add-agent-config',
      '003-create-agent-runs',
      '004-create-features',
      '005-add-feature-refs-to-agent-runs',
      '006-add-approval-workflow',
      '007-add-spec-path',
      '008-add-approval-gates-and-phase-timings',
      '009-add-notification-preferences',
      '010-add-workflow-flags-and-pr-tracking',
      '011-add-worktree-path',
      '012-add-push-column',
      '013-add-user-query',
      '014-add-approval-wait-timing',
      '015-create-repositories-and-backfill',
      '016-add-repository-soft-delete',
      '017-fix-repository-names',
      '018-add-onboarding-and-approval-defaults',
      '019-add-ci-fix-tracking',
      '020-add-parent-id-and-backfill-ci-fix',
      '021-backfill-ci-fix-columns',
      '022-add-pr-notification-filters',
      '023-backfill-orphaned-repositories',
      '024-add-feature-flags-and-ci-workflow',
      '025-add-model-default',
      '026-add-model-id-to-agent-runs',
      '027-add-fast-column',
      '028-add-attachments',
      '029-add-feature-soft-delete',
      '030-add-evidence-workflow-settings',
      '031-add-pr-mergeable',
      '032-update-env-deploy-default',
      '033-create-pr-sync-lock',
      '034-add-merge-review-notifications',
    ];

    it('should unlog migration whose expected table is missing after bootstrap', () => {
      // Simulate a DB that had all tables EXCEPT pr_sync_lock created,
      // but user_version was already set to 34.
      // Create the core tables that would exist in a real DB at version 34:
      db.exec(`
        CREATE TABLE settings (id TEXT PRIMARY KEY);
        CREATE TABLE agent_runs (id TEXT PRIMARY KEY);
        CREATE TABLE features (id TEXT PRIMARY KEY);
        CREATE TABLE phase_timings (id TEXT PRIMARY KEY);
        CREATE TABLE repositories (id TEXT PRIMARY KEY);
      `);
      // Deliberately omit pr_sync_lock table
      db.pragma('user_version = 34');

      // Construct storage — bootstrap seeds all 34 records,
      // then verification should detect missing pr_sync_lock and unlog 033
      new SQLiteMigrationStorage(db, ALL_LEGACY_NAMES);

      const applied = db.prepare('SELECT name FROM umzug_migrations ORDER BY name').all() as {
        name: string;
      }[];
      const appliedNames = applied.map((r) => r.name);

      // Migration 033 should have been removed because pr_sync_lock table is missing
      expect(appliedNames).not.toContain('033-create-pr-sync-lock');
      // Other migrations should still be seeded
      expect(appliedNames).toContain('001-create-settings-table');
      expect(appliedNames).toContain('004-create-features');
      expect(appliedNames).toContain('034-add-merge-review-notifications');
      expect(applied).toHaveLength(33);
    });

    it('should not unlog migration when expected table exists', () => {
      // Create ALL tables including pr_sync_lock
      db.exec(`
        CREATE TABLE settings (id TEXT PRIMARY KEY);
        CREATE TABLE agent_runs (id TEXT PRIMARY KEY);
        CREATE TABLE features (id TEXT PRIMARY KEY);
        CREATE TABLE phase_timings (id TEXT PRIMARY KEY);
        CREATE TABLE repositories (id TEXT PRIMARY KEY);
        CREATE TABLE pr_sync_lock (id INTEGER PRIMARY KEY);
      `);
      db.pragma('user_version = 34');

      new SQLiteMigrationStorage(db, ALL_LEGACY_NAMES);

      const applied = db.prepare('SELECT name FROM umzug_migrations ORDER BY name').all() as {
        name: string;
      }[];
      const appliedNames = applied.map((r) => r.name);

      // All 34 should remain seeded
      expect(appliedNames).toContain('033-create-pr-sync-lock');
      expect(applied).toHaveLength(34);
    });

    it('should unlog multiple migrations when multiple tables are missing', () => {
      // Create only settings and agent_runs — missing features, phase_timings,
      // repositories, and pr_sync_lock
      db.exec(`
        CREATE TABLE settings (id TEXT PRIMARY KEY);
        CREATE TABLE agent_runs (id TEXT PRIMARY KEY);
      `);
      db.pragma('user_version = 34');

      new SQLiteMigrationStorage(db, ALL_LEGACY_NAMES);

      const applied = db.prepare('SELECT name FROM umzug_migrations ORDER BY name').all() as {
        name: string;
      }[];
      const appliedNames = applied.map((r) => r.name);

      // These migrations' tables are missing, so they should be unlogged
      expect(appliedNames).not.toContain('004-create-features');
      expect(appliedNames).not.toContain('008-add-approval-gates-and-phase-timings');
      expect(appliedNames).not.toContain('015-create-repositories-and-backfill');
      expect(appliedNames).not.toContain('033-create-pr-sync-lock');
      // These tables exist, so their migrations remain
      expect(appliedNames).toContain('001-create-settings-table');
      expect(appliedNames).toContain('003-create-agent-runs');
      expect(applied).toHaveLength(30);
    });

    it('should not run verification when bootstrap did not seed (fresh DB)', () => {
      // Fresh DB with user_version = 0 — bootstrap doesn't seed, verification shouldn't run
      new SQLiteMigrationStorage(db, ALL_LEGACY_NAMES);

      const count = db.prepare('SELECT COUNT(*) as count FROM umzug_migrations').get() as {
        count: number;
      };
      expect(count.count).toBe(0);
    });

    it('should not run verification when bootstrap skipped (table already has records)', async () => {
      // Pre-populate umzug_migrations with one record
      db.exec(`
        CREATE TABLE settings (id TEXT PRIMARY KEY);
      `);
      storage = new SQLiteMigrationStorage(db);
      await storage.logMigration({ name: '001-create-settings-table', context: db });

      db.pragma('user_version = 34');

      // Construct with legacy names — bootstrap should skip (table not empty),
      // and verification should NOT run either
      new SQLiteMigrationStorage(db, ALL_LEGACY_NAMES);

      const count = db.prepare('SELECT COUNT(*) as count FROM umzug_migrations').get() as {
        count: number;
      };
      // Should still have just the one record we manually logged
      expect(count.count).toBe(1);
    });
  });
});
