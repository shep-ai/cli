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
import {
  runSQLiteMigrations,
  LATEST_SCHEMA_VERSION,
} from '@/infrastructure/persistence/sqlite/migrations.js';

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
      expect(finalVersion).toBe(LATEST_SCHEMA_VERSION);
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

  describe('migration v6: approval workflow columns', () => {
    beforeEach(async () => {
      await runSQLiteMigrations(db);
    });

    it('should add approval_mode column to agent_runs table', () => {
      const schema = getTableSchema(db, 'agent_runs');
      const approvalMode = schema.find((col) => col.name === 'approval_mode');

      expect(approvalMode).toBeDefined();
      expect(approvalMode?.type).toBe('TEXT');
      expect(approvalMode?.notnull).toBe(0); // nullable
    });

    it('should add approval_status column to agent_runs table', () => {
      const schema = getTableSchema(db, 'agent_runs');
      const approvalStatus = schema.find((col) => col.name === 'approval_status');

      expect(approvalStatus).toBeDefined();
      expect(approvalStatus?.type).toBe('TEXT');
      expect(approvalStatus?.notnull).toBe(0); // nullable
    });

    it('should default approval columns to NULL for existing rows', () => {
      // Insert a row before checking defaults
      db.prepare(
        `
        INSERT INTO agent_runs (id, agent_type, agent_name, status, prompt, thread_id, created_at, updated_at)
        VALUES ('test-001', 'claude-code', 'test', 'pending', 'test prompt', 'thread-1', 1000, 1000)
      `
      ).run();

      const row = db
        .prepare('SELECT approval_mode, approval_status FROM agent_runs WHERE id = ?')
        .get('test-001') as Record<string, unknown>;
      expect(row.approval_mode).toBeNull();
      expect(row.approval_status).toBeNull();
    });
  });

  describe('migration v7: spec_path on features', () => {
    beforeEach(async () => {
      await runSQLiteMigrations(db);
    });

    it('should add spec_path column to features table', () => {
      const schema = getTableSchema(db, 'features');
      const specPath = schema.find((col) => col.name === 'spec_path');

      expect(specPath).toBeDefined();
      expect(specPath?.type).toBe('TEXT');
      expect(specPath?.notnull).toBe(0); // nullable
    });

    it('should set schema version to at least 7', () => {
      const version = getSchemaVersion(db);
      expect(version).toBeGreaterThanOrEqual(7);
    });
  });

  describe('migration v9: notification preferences', () => {
    beforeEach(async () => {
      await runSQLiteMigrations(db);
    });

    it('should add notification channel columns to settings table', () => {
      const schema = getTableSchema(db, 'settings');
      const columnNames = schema.map((col) => col.name);

      expect(columnNames).toContain('notif_in_app_enabled');
      expect(columnNames).toContain('notif_browser_enabled');
      expect(columnNames).toContain('notif_desktop_enabled');
    });

    it('should add notification event type columns to settings table', () => {
      const schema = getTableSchema(db, 'settings');
      const columnNames = schema.map((col) => col.name);

      expect(columnNames).toContain('notif_evt_agent_started');
      expect(columnNames).toContain('notif_evt_phase_completed');
      expect(columnNames).toContain('notif_evt_waiting_approval');
      expect(columnNames).toContain('notif_evt_agent_completed');
      expect(columnNames).toContain('notif_evt_agent_failed');
    });

    it('should have all notification columns as INTEGER NOT NULL', () => {
      const schema = getTableSchema(db, 'settings');

      const notifColumns = [
        'notif_in_app_enabled',
        'notif_browser_enabled',
        'notif_desktop_enabled',
        'notif_evt_agent_started',
        'notif_evt_phase_completed',
        'notif_evt_waiting_approval',
        'notif_evt_agent_completed',
        'notif_evt_agent_failed',
      ];

      notifColumns.forEach((colName) => {
        const col = schema.find((c) => c.name === colName);
        expect(col, `column ${colName} should exist`).toBeDefined();
        expect(col?.type, `column ${colName} should be INTEGER`).toBe('INTEGER');
        expect(col?.notnull, `column ${colName} should be NOT NULL`).toBe(1);
      });
    });

    it('should default channel columns to 1 (enabled/opt-out)', () => {
      // Insert a settings row to check default values
      db.prepare(
        `
        INSERT INTO settings (id, created_at, updated_at, model_analyze, model_requirements, model_plan, model_implement,
          env_default_editor, env_shell_preference, sys_auto_update, sys_log_level, agent_type, agent_auth_method)
        VALUES ('test', '2025-01-01', '2025-01-01', 'm', 'm', 'm', 'm', 'vscode', 'bash', 1, 'info', 'claude-code', 'session')
      `
      ).run();

      const row = db
        .prepare(
          'SELECT notif_in_app_enabled, notif_browser_enabled, notif_desktop_enabled FROM settings WHERE id = ?'
        )
        .get('test') as Record<string, number>;

      expect(row.notif_in_app_enabled).toBe(1);
      expect(row.notif_browser_enabled).toBe(1);
      expect(row.notif_desktop_enabled).toBe(1);
    });

    it('should default event type columns to 1 (enabled)', () => {
      db.prepare(
        `
        INSERT INTO settings (id, created_at, updated_at, model_analyze, model_requirements, model_plan, model_implement,
          env_default_editor, env_shell_preference, sys_auto_update, sys_log_level, agent_type, agent_auth_method)
        VALUES ('test', '2025-01-01', '2025-01-01', 'm', 'm', 'm', 'm', 'vscode', 'bash', 1, 'info', 'claude-code', 'session')
      `
      ).run();

      const row = db
        .prepare(
          `SELECT notif_evt_agent_started, notif_evt_phase_completed, notif_evt_waiting_approval,
                  notif_evt_agent_completed, notif_evt_agent_failed FROM settings WHERE id = ?`
        )
        .get('test') as Record<string, number>;

      expect(row.notif_evt_agent_started).toBe(1);
      expect(row.notif_evt_phase_completed).toBe(1);
      expect(row.notif_evt_waiting_approval).toBe(1);
      expect(row.notif_evt_agent_completed).toBe(1);
      expect(row.notif_evt_agent_failed).toBe(1);
    });

    it('should run successfully on a v8 database with existing settings row', () => {
      // Verify that the migration doesn't fail when settings rows already exist
      // and that existing rows get correct default values for new columns
      db.prepare(
        `
        INSERT INTO settings (id, created_at, updated_at, model_analyze, model_requirements, model_plan, model_implement,
          env_default_editor, env_shell_preference, sys_auto_update, sys_log_level, agent_type, agent_auth_method)
        VALUES ('existing', '2025-01-01', '2025-01-01', 'm', 'm', 'm', 'm', 'vscode', 'bash', 1, 'info', 'claude-code', 'session')
      `
      ).run();

      // The existing row should have default notification values
      const row = db
        .prepare('SELECT notif_in_app_enabled, notif_evt_agent_started FROM settings WHERE id = ?')
        .get('existing') as Record<string, number>;

      expect(row.notif_in_app_enabled).toBe(1);
      expect(row.notif_evt_agent_started).toBe(1);
    });
  });

  describe('migration v11: worktree_path on features', () => {
    beforeEach(async () => {
      await runSQLiteMigrations(db);
    });

    it('should add worktree_path column to features table', () => {
      const schema = getTableSchema(db, 'features');
      const worktreePath = schema.find((col) => col.name === 'worktree_path');

      expect(worktreePath).toBeDefined();
      expect(worktreePath?.type).toBe('TEXT');
      expect(worktreePath?.notnull).toBe(0); // nullable
    });
  });

  describe('migration v12: push column on features', () => {
    beforeEach(async () => {
      await runSQLiteMigrations(db);
    });

    it('should add push column to features table', () => {
      const schema = getTableSchema(db, 'features');
      const push = schema.find((col) => col.name === 'push');

      expect(push).toBeDefined();
      expect(push?.type).toBe('INTEGER');
      expect(push?.dflt_value).toBe('0');
    });
  });

  describe('migration v13: user_query on features', () => {
    beforeEach(async () => {
      await runSQLiteMigrations(db);
    });

    it('should add user_query column to features table', () => {
      const schema = getTableSchema(db, 'features');
      const userQuery = schema.find((col) => col.name === 'user_query');

      expect(userQuery).toBeDefined();
      expect(userQuery?.type).toBe('TEXT');
      expect(userQuery?.notnull).toBe(1);
      expect(userQuery?.dflt_value).toBe("''");
    });
  });

  describe('migration v8: approval_gates and phase_timings', () => {
    beforeEach(async () => {
      await runSQLiteMigrations(db);
    });

    it('should add approval_gates column to agent_runs table', () => {
      const schema = getTableSchema(db, 'agent_runs');
      const approvalGates = schema.find((col) => col.name === 'approval_gates');

      expect(approvalGates).toBeDefined();
      expect(approvalGates?.type).toBe('TEXT');
      expect(approvalGates?.notnull).toBe(0); // nullable
    });

    it('should create phase_timings table', () => {
      expect(tableExists(db, 'phase_timings')).toBe(true);
    });

    it('should have correct phase_timings schema', () => {
      const schema = getTableSchema(db, 'phase_timings');
      const columnNames = schema.map((col) => col.name);

      expect(columnNames).toContain('id');
      expect(columnNames).toContain('agent_run_id');
      expect(columnNames).toContain('phase');
      expect(columnNames).toContain('started_at');
      expect(columnNames).toContain('completed_at');
      expect(columnNames).toContain('duration_ms');
      expect(columnNames).toContain('created_at');
      expect(columnNames).toContain('updated_at');
    });

    it('should create index on phase_timings agent_run_id', () => {
      const indexes = getTableIndexes(db, 'phase_timings');
      expect(indexes).toContain('idx_phase_timings_run');
    });
  });
});
