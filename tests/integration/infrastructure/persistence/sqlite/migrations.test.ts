/**
 * SQLite Migrations Integration Tests
 *
 * Tests for database migration functionality.
 * Verifies that migrations create correct schema and are idempotent.
 *
 * TDD Phase: RED
 * - These tests are written BEFORE implementation
 * - All tests should FAIL initially (migrations don't exist yet)
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
import { runSQLiteMigrations } from '../../../../../src/infrastructure/persistence/sqlite/migrations.js';

describe('SQLite Migrations', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = createInMemoryDatabase();
  });

  afterEach(() => {
    db.close();
  });

  describe('migration execution', () => {
    it('should create settings table', async () => {
      // Act
      await runSQLiteMigrations(db);

      // Assert
      expect(tableExists(db, 'settings')).toBe(true);
    });

    it('should set user_version pragma to track migration', async () => {
      // Arrange
      const initialVersion = getSchemaVersion(db);
      expect(initialVersion).toBe(0);

      // Act
      await runSQLiteMigrations(db);

      // Assert
      const finalVersion = getSchemaVersion(db);
      expect(finalVersion).toBeGreaterThan(0);
    });

    it('should be idempotent (safe to run twice)', async () => {
      // Act
      await runSQLiteMigrations(db);
      const versionAfterFirst = getSchemaVersion(db);

      // Should not throw when run again
      await expect(runSQLiteMigrations(db)).resolves.not.toThrow();

      // Assert
      const versionAfterSecond = getSchemaVersion(db);
      expect(versionAfterSecond).toBe(versionAfterFirst);
    });

    it('should create all required columns in settings table', async () => {
      // Act
      await runSQLiteMigrations(db);

      // Assert
      const schema = getTableSchema(db, 'settings');
      const columnNames = schema.map((col) => col.name);

      // Required columns
      expect(columnNames).toContain('id');
      expect(columnNames).toContain('created_at');
      expect(columnNames).toContain('updated_at');

      // ModelConfiguration columns
      expect(columnNames).toContain('model_analyze');
      expect(columnNames).toContain('model_requirements');
      expect(columnNames).toContain('model_plan');
      expect(columnNames).toContain('model_implement');

      // UserProfile columns
      expect(columnNames).toContain('user_name');
      expect(columnNames).toContain('user_email');
      expect(columnNames).toContain('user_github_username');

      // EnvironmentConfig columns
      expect(columnNames).toContain('env_default_editor');
      expect(columnNames).toContain('env_shell_preference');

      // SystemConfig columns
      expect(columnNames).toContain('sys_auto_update');
      expect(columnNames).toContain('sys_log_level');

      // AgentConfig columns
      expect(columnNames).toContain('agent_type');
      expect(columnNames).toContain('agent_auth_method');
      expect(columnNames).toContain('agent_token');
    });

    it('should create unique index for singleton pattern', async () => {
      // Act
      await runSQLiteMigrations(db);

      // Assert
      const indexes = getTableIndexes(db, 'settings');
      expect(indexes.length).toBeGreaterThan(0);

      // Check that there's an index on id column (for singleton enforcement)
      const schema = getTableSchema(db, 'settings');
      const idColumn = schema.find((col) => col.name === 'id');
      expect(idColumn).toBeDefined();
      expect(idColumn?.pk).toBe(1); // Primary key enforces uniqueness
    });
  });

  describe('settings table schema', () => {
    beforeEach(async () => {
      await runSQLiteMigrations(db);
    });

    it('should have id as primary key', () => {
      // Arrange & Act
      const schema = getTableSchema(db, 'settings');
      const idColumn = schema.find((col) => col.name === 'id');

      // Assert
      expect(idColumn).toBeDefined();
      expect(idColumn?.pk).toBe(1);
      expect(idColumn?.type).toBe('TEXT');
      expect(idColumn?.notnull).toBe(1);
    });

    it('should have required timestamp columns', () => {
      // Arrange & Act
      const schema = getTableSchema(db, 'settings');
      const createdAt = schema.find((col) => col.name === 'created_at');
      const updatedAt = schema.find((col) => col.name === 'updated_at');

      // Assert
      expect(createdAt).toBeDefined();
      expect(createdAt?.type).toBe('TEXT');
      expect(createdAt?.notnull).toBe(1);

      expect(updatedAt).toBeDefined();
      expect(updatedAt?.type).toBe('TEXT');
      expect(updatedAt?.notnull).toBe(1);
    });

    it('should have model configuration columns', () => {
      // Arrange & Act
      const schema = getTableSchema(db, 'settings');

      // Assert
      const modelColumns = ['model_analyze', 'model_requirements', 'model_plan', 'model_implement'];

      modelColumns.forEach((colName) => {
        const col = schema.find((c) => c.name === colName);
        expect(col).toBeDefined();
        expect(col?.type).toBe('TEXT');
        expect(col?.notnull).toBe(1);
      });
    });

    it('should have optional user profile columns', () => {
      // Arrange & Act
      const schema = getTableSchema(db, 'settings');

      // Assert
      const userColumns = ['user_name', 'user_email', 'user_github_username'];

      userColumns.forEach((colName) => {
        const col = schema.find((c) => c.name === colName);
        expect(col).toBeDefined();
        expect(col?.type).toBe('TEXT');
        expect(col?.notnull).toBe(0); // NULL allowed (optional fields)
      });
    });

    it('should have environment configuration columns', () => {
      // Arrange & Act
      const schema = getTableSchema(db, 'settings');

      // Assert
      const envColumns = ['env_default_editor', 'env_shell_preference'];

      envColumns.forEach((colName) => {
        const col = schema.find((c) => c.name === colName);
        expect(col).toBeDefined();
        expect(col?.type).toBe('TEXT');
        expect(col?.notnull).toBe(1);
      });
    });

    it('should have system configuration columns', () => {
      // Arrange & Act
      const schema = getTableSchema(db, 'settings');

      // Assert
      const sysAutoUpdate = schema.find((c) => c.name === 'sys_auto_update');
      const sysLogLevel = schema.find((c) => c.name === 'sys_log_level');

      expect(sysAutoUpdate).toBeDefined();
      expect(sysAutoUpdate?.type).toBe('INTEGER'); // Boolean stored as INTEGER
      expect(sysAutoUpdate?.notnull).toBe(1);

      expect(sysLogLevel).toBeDefined();
      expect(sysLogLevel?.type).toBe('TEXT');
      expect(sysLogLevel?.notnull).toBe(1);
    });
  });

  describe('migration SQL validation', () => {
    it('should execute valid SQL without errors', async () => {
      // Act & Assert
      await expect(runSQLiteMigrations(db)).resolves.not.toThrow();
    });

    it('should handle multiple migration runs gracefully', async () => {
      // Act & Assert
      await runSQLiteMigrations(db);
      await runSQLiteMigrations(db);
      await runSQLiteMigrations(db);

      // Should still have correct schema
      expect(tableExists(db, 'settings')).toBe(true);
      const schema = getTableSchema(db, 'settings');
      expect(schema.length).toBeGreaterThan(0);
    });
  });
});
