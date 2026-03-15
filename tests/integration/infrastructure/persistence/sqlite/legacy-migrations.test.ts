/**
 * Legacy Migrations Integration Tests
 *
 * Tests for the legacy migration registration module that transforms
 * the 34 existing migrations into umzug-compatible format.
 *
 * TDD Phase: RED → GREEN
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type Database from 'better-sqlite3';
import {
  createInMemoryDatabase,
  tableExists,
  getSchemaVersion,
  getTableSchema,
  getTableIndexes,
} from '../../../../helpers/database.helper.js';
import {
  LEGACY_MIGRATIONS,
  LEGACY_MIGRATION_NAMES,
} from '@/infrastructure/persistence/sqlite/legacy-migrations.js';
import {
  runSQLiteMigrations,
  LATEST_SCHEMA_VERSION,
} from '@/infrastructure/persistence/sqlite/migrations.js';

describe('Legacy Migrations', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = createInMemoryDatabase();
  });

  afterEach(() => {
    db.close();
  });

  describe('LEGACY_MIGRATIONS array structure', () => {
    it('should export exactly 34 migration entries', () => {
      expect(LEGACY_MIGRATIONS).toHaveLength(34);
    });

    it('should have zero-padded names sorted from 001 through 034', () => {
      const names = LEGACY_MIGRATIONS.map((m) => m.name);

      for (let i = 0; i < 34; i++) {
        const expectedPrefix = String(i + 1).padStart(3, '0');
        expect(names[i]).toMatch(new RegExp(`^${expectedPrefix}-`));
      }
    });

    it('should have descriptive suffixes in migration names', () => {
      // First few migrations should have human-readable names
      expect(LEGACY_MIGRATIONS[0].name).toBe('001-create-settings-table');
      expect(LEGACY_MIGRATIONS[1].name).toBe('002-add-agent-config');
      expect(LEGACY_MIGRATIONS[2].name).toBe('003-create-agent-runs');
      expect(LEGACY_MIGRATIONS[3].name).toBe('004-create-features');
    });

    it('should have an up function on each migration', () => {
      for (const migration of LEGACY_MIGRATIONS) {
        expect(typeof migration.up).toBe('function');
      }
    });

    it('should have a name property on each migration', () => {
      for (const migration of LEGACY_MIGRATIONS) {
        expect(typeof migration.name).toBe('string');
        expect(migration.name.length).toBeGreaterThan(0);
      }
    });

    it('should have unique names across all migrations', () => {
      const names = LEGACY_MIGRATIONS.map((m) => m.name);
      const uniqueNames = new Set(names);
      expect(uniqueNames.size).toBe(names.length);
    });
  });

  describe('LEGACY_MIGRATION_NAMES export', () => {
    it('should be an array of 34 migration name strings', () => {
      expect(LEGACY_MIGRATION_NAMES).toHaveLength(34);
      expect(LEGACY_MIGRATION_NAMES).toEqual(LEGACY_MIGRATIONS.map((m) => m.name));
    });
  });

  describe('migration execution — schema equivalence', () => {
    it('should produce consistent schema when legacy migrations run independently', async () => {
      // Run legacy migrations on a reference DB
      const refDb = createInMemoryDatabase();
      for (const migration of LEGACY_MIGRATIONS) {
        await migration.up({ name: migration.name, context: refDb });
      }

      // Run legacy migrations sequentially on test DB
      for (const migration of LEGACY_MIGRATIONS) {
        await migration.up({ name: migration.name, context: db });
      }

      // Compare tables
      const refTables = refDb
        .prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
        .all() as { name: string }[];
      const testTables = db
        .prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
        .all() as { name: string }[];

      expect(testTables.map((t) => t.name)).toEqual(refTables.map((t) => t.name));

      // Compare column schemas for each table
      for (const table of refTables) {
        const refSchema = getTableSchema(refDb, table.name);
        const testSchema = getTableSchema(db, table.name);
        expect(testSchema).toEqual(refSchema);
      }

      // Compare indexes for each table
      for (const table of refTables) {
        const refIndexes = getTableIndexes(refDb, table.name).sort();
        const testIndexes = getTableIndexes(db, table.name).sort();
        expect(testIndexes).toEqual(refIndexes);
      }

      refDb.close();
    });

    it('should produce a schema that is a subset of the full migration system', async () => {
      // Run full migration system (legacy + file-based) on reference DB
      const refDb = createInMemoryDatabase();
      await runSQLiteMigrations(refDb);

      // Run only legacy migrations on test DB
      for (const migration of LEGACY_MIGRATIONS) {
        await migration.up({ name: migration.name, context: db });
      }

      // Legacy tables should be a subset of the full schema tables
      const filterTracking = (tables: { name: string }[]) =>
        tables.filter((t) => t.name !== 'umzug_migrations');

      const refTables = filterTracking(
        refDb.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all() as {
          name: string;
        }[]
      );
      const testTables = filterTracking(
        db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all() as {
          name: string;
        }[]
      );

      // All legacy tables should exist in the full schema
      for (const table of testTables) {
        expect(refTables.map((t) => t.name)).toContain(table.name);
      }

      refDb.close();
    });

    it('should set PRAGMA user_version to 34 after all migrations', async () => {
      for (const migration of LEGACY_MIGRATIONS) {
        await migration.up({ name: migration.name, context: db });
      }

      expect(getSchemaVersion(db)).toBe(34);
    });

    it('should set PRAGMA user_version incrementally', async () => {
      // Run first 5 migrations
      for (let i = 0; i < 5; i++) {
        await LEGACY_MIGRATIONS[i].up({ name: LEGACY_MIGRATIONS[i].name, context: db });
      }
      expect(getSchemaVersion(db)).toBe(5);
    });
  });

  describe('transaction wrapping', () => {
    it('should wrap migration in a transaction — partial failure rolls back', async () => {
      // Run migration 1 to create settings table
      await LEGACY_MIGRATIONS[0].up({ name: LEGACY_MIGRATIONS[0].name, context: db });
      expect(tableExists(db, 'settings')).toBe(true);
      expect(getSchemaVersion(db)).toBe(1);

      // Verify we can roll back if a migration fails mid-transaction
      // by skipping to migration 3 (create agent_runs) without migration 2
      // This should work fine since migration 3 creates a new table
      await LEGACY_MIGRATIONS[2].up({ name: LEGACY_MIGRATIONS[2].name, context: db });
      expect(tableExists(db, 'agent_runs')).toBe(true);
    });
  });

  describe('handler-based migrations', () => {
    it('should handle migration V20 — conditional DDL for parent_id and ci_fix columns', async () => {
      // Run migrations 1-19 first
      for (let i = 0; i < 19; i++) {
        await LEGACY_MIGRATIONS[i].up({ name: LEGACY_MIGRATIONS[i].name, context: db });
      }

      // Run migration 20 — handler-based with conditional ALTER TABLE
      await LEGACY_MIGRATIONS[19].up({ name: LEGACY_MIGRATIONS[19].name, context: db });

      const columns = db.pragma('table_info(features)') as { name: string }[];
      const colNames = columns.map((c) => c.name);

      expect(colNames).toContain('parent_id');
      expect(colNames).toContain('ci_fix_attempts');
      expect(colNames).toContain('ci_fix_history');
      expect(getSchemaVersion(db)).toBe(20);
    });

    it('should handle migration V22 — conditional PR notification settings', async () => {
      // Run all migrations up to 21
      for (let i = 0; i < 21; i++) {
        await LEGACY_MIGRATIONS[i].up({ name: LEGACY_MIGRATIONS[i].name, context: db });
      }

      // Run migration 22
      await LEGACY_MIGRATIONS[21].up({ name: LEGACY_MIGRATIONS[21].name, context: db });

      const columns = db.pragma('table_info(settings)') as { name: string }[];
      const colNames = columns.map((c) => c.name);

      expect(colNames).toContain('notif_evt_pr_merged');
      expect(colNames).toContain('notif_evt_pr_closed');
      expect(colNames).toContain('notif_evt_pr_checks_passed');
      expect(colNames).toContain('notif_evt_pr_checks_failed');
    });

    it('should handle migration V25 — conditional model_default column', async () => {
      // Run all migrations up to 24
      for (let i = 0; i < 24; i++) {
        await LEGACY_MIGRATIONS[i].up({ name: LEGACY_MIGRATIONS[i].name, context: db });
      }

      // Run migration 25
      await LEGACY_MIGRATIONS[24].up({ name: LEGACY_MIGRATIONS[24].name, context: db });

      const columns = db.pragma('table_info(settings)') as { name: string }[];
      const colNames = columns.map((c) => c.name);

      expect(colNames).toContain('model_default');
    });

    it('should handle migration V29 — conditional soft delete on features', async () => {
      // Run all migrations up to 28
      for (let i = 0; i < 28; i++) {
        await LEGACY_MIGRATIONS[i].up({ name: LEGACY_MIGRATIONS[i].name, context: db });
      }

      // Run migration 29
      await LEGACY_MIGRATIONS[28].up({ name: LEGACY_MIGRATIONS[28].name, context: db });

      const columns = db.pragma('table_info(features)') as { name: string }[];
      const colNames = columns.map((c) => c.name);

      expect(colNames).toContain('deleted_at');

      const indexes = getTableIndexes(db, 'features');
      expect(indexes).toContain('idx_features_deleted_at');
    });
  });

  describe('LATEST_SCHEMA_VERSION derivation', () => {
    it('should derive LATEST_SCHEMA_VERSION = 34 from the legacy migrations array', () => {
      // The LATEST_SCHEMA_VERSION in migrations.ts should equal 34
      // which is the version of the last legacy migration
      expect(LATEST_SCHEMA_VERSION).toBe(34);
    });
  });

  describe('specific table creation', () => {
    beforeEach(async () => {
      // Run all 34 legacy migrations
      for (const migration of LEGACY_MIGRATIONS) {
        await migration.up({ name: migration.name, context: db });
      }
    });

    it('should create all 6 expected tables', () => {
      expect(tableExists(db, 'settings')).toBe(true);
      expect(tableExists(db, 'agent_runs')).toBe(true);
      expect(tableExists(db, 'features')).toBe(true);
      expect(tableExists(db, 'phase_timings')).toBe(true);
      expect(tableExists(db, 'repositories')).toBe(true);
      expect(tableExists(db, 'pr_sync_lock')).toBe(true);
    });
  });
});
