/**
 * SQLite Settings Repository Integration Tests
 *
 * Tests for the SQLite implementation of ISettingsRepository.
 * Verifies repository operations, singleton constraint, and database mapping.
 *
 * TDD Phase: RED
 * - Tests written BEFORE implementation
 * - All tests should FAIL initially
 */

import 'reflect-metadata';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type Database from 'better-sqlite3';
import { createInMemoryDatabase, tableExists } from '../../../helpers/database.helper.js';
import { runSQLiteMigrations } from '@/infrastructure/persistence/sqlite/migrations.js';
import { SQLiteSettingsRepository } from '@/infrastructure/repositories/sqlite-settings.repository.js';
import type { Settings } from '@/domain/generated/output.js';
import { AgentType, AgentAuthMethod, EditorType } from '@/domain/generated/output.js';

describe('SQLiteSettingsRepository', () => {
  let db: Database.Database;
  let repository: SQLiteSettingsRepository;

  // Sample test data
  const createTestSettings = (): Settings => ({
    id: 'singleton',
    createdAt: new Date('2025-01-01T00:00:00Z'),
    updatedAt: new Date('2025-01-01T00:00:00Z'),
    models: {
      analyze: 'claude-opus-4',
      requirements: 'claude-sonnet-4',
      plan: 'claude-sonnet-4',
      implement: 'claude-sonnet-4',
    },
    user: {
      name: 'Test User',
      email: 'test@example.com',
      githubUsername: 'testuser',
    },
    environment: {
      defaultEditor: EditorType.VsCode,
      shellPreference: 'zsh',
    },
    system: {
      autoUpdate: true,
      logLevel: 'info',
    },
    agent: {
      type: AgentType.ClaudeCode,
      authMethod: AgentAuthMethod.Session,
    },
    notifications: {
      inApp: { enabled: false },
      browser: { enabled: false },
      desktop: { enabled: false },
      events: {
        agentStarted: true,
        phaseCompleted: true,
        waitingApproval: true,
        agentCompleted: true,
        agentFailed: true,
      },
    },
    workflow: {
      openPrOnImplementationComplete: false,
      approvalGateDefaults: {
        allowPrd: false,
        allowPlan: false,
        allowMerge: false,
        pushOnImplementationComplete: false,
      },
    },
    onboardingComplete: false,
  });

  beforeEach(async () => {
    // Create fresh database for each test
    db = createInMemoryDatabase();

    // Run migrations to create schema
    await runSQLiteMigrations(db);

    // Verify migrations worked
    expect(tableExists(db, 'settings')).toBe(true);

    // Create repository instance
    repository = new SQLiteSettingsRepository(db);
  });

  afterEach(() => {
    db.close();
  });

  describe('initialize()', () => {
    it('should create new settings in database', async () => {
      // Arrange
      const settings = createTestSettings();

      // Act
      await repository.initialize(settings);

      // Assert - verify data was inserted
      const row = db.prepare('SELECT * FROM settings WHERE id = ?').get('singleton') as Record<
        string,
        unknown
      >;
      expect(row).toBeDefined();
      expect(row.id).toBe('singleton');
    });

    it('should store all model configuration fields', async () => {
      // Arrange
      const settings = createTestSettings();

      // Act
      await repository.initialize(settings);

      // Assert
      const row = db.prepare('SELECT * FROM settings WHERE id = ?').get('singleton') as Record<
        string,
        unknown
      >;
      expect(row.model_analyze).toBe('claude-opus-4');
      expect(row.model_requirements).toBe('claude-sonnet-4');
      expect(row.model_plan).toBe('claude-sonnet-4');
      expect(row.model_implement).toBe('claude-sonnet-4');
    });

    it('should store optional user profile fields', async () => {
      // Arrange
      const settings = createTestSettings();

      // Act
      await repository.initialize(settings);

      // Assert
      const row = db.prepare('SELECT * FROM settings WHERE id = ?').get('singleton') as Record<
        string,
        unknown
      >;
      expect(row.user_name).toBe('Test User');
      expect(row.user_email).toBe('test@example.com');
      expect(row.user_github_username).toBe('testuser');
    });

    it('should handle missing optional user fields', async () => {
      // Arrange
      const settings = createTestSettings();
      settings.user = {}; // No optional fields

      // Act
      await repository.initialize(settings);

      // Assert
      const row = db.prepare('SELECT * FROM settings WHERE id = ?').get('singleton') as Record<
        string,
        unknown
      >;
      expect(row.user_name).toBeNull();
      expect(row.user_email).toBeNull();
      expect(row.user_github_username).toBeNull();
    });

    it('should store environment configuration', async () => {
      // Arrange
      const settings = createTestSettings();

      // Act
      await repository.initialize(settings);

      // Assert
      const row = db.prepare('SELECT * FROM settings WHERE id = ?').get('singleton') as Record<
        string,
        unknown
      >;
      expect(row.env_default_editor).toBe('vscode');
      expect(row.env_shell_preference).toBe('zsh');
    });

    it('should store system configuration with boolean as integer', async () => {
      // Arrange
      const settings = createTestSettings();

      // Act
      await repository.initialize(settings);

      // Assert
      const row = db.prepare('SELECT * FROM settings WHERE id = ?').get('singleton') as Record<
        string,
        unknown
      >;
      expect(row.sys_auto_update).toBe(1); // true -> 1
      expect(row.sys_log_level).toBe('info');
    });

    it('should enforce singleton constraint (only one settings record)', async () => {
      // Arrange
      const settings1 = createTestSettings();
      const settings2 = createTestSettings();

      // Act
      await repository.initialize(settings1);

      // Assert - second initialization should fail
      await expect(repository.initialize(settings2)).rejects.toThrow();
    });

    it('should store timestamps as ISO 8601 strings', async () => {
      // Arrange
      const settings = createTestSettings();

      // Act
      await repository.initialize(settings);

      // Assert
      const row = db.prepare('SELECT * FROM settings WHERE id = ?').get('singleton') as Record<
        string,
        unknown
      >;
      expect(typeof row.created_at).toBe('string');
      expect(typeof row.updated_at).toBe('string');
      expect(row.created_at).toBe('2025-01-01T00:00:00.000Z');
      expect(row.updated_at).toBe('2025-01-01T00:00:00.000Z');
    });
  });

  describe('load()', () => {
    it('should return null when settings do not exist', async () => {
      // Act
      const result = await repository.load();

      // Assert
      expect(result).toBeNull();
    });

    it('should load existing settings from database', async () => {
      // Arrange - insert settings first
      const settings = createTestSettings();
      await repository.initialize(settings);

      // Act
      const loaded = await repository.load();

      // Assert
      expect(loaded).not.toBeNull();
      expect(loaded?.id).toBe('singleton');
    });

    it('should correctly map model configuration from database', async () => {
      // Arrange
      const settings = createTestSettings();
      await repository.initialize(settings);

      // Act
      const loaded = await repository.load();

      // Assert
      expect(loaded?.models).toEqual({
        analyze: 'claude-opus-4',
        requirements: 'claude-sonnet-4',
        plan: 'claude-sonnet-4',
        implement: 'claude-sonnet-4',
      });
    });

    it('should correctly map user profile from database', async () => {
      // Arrange
      const settings = createTestSettings();
      await repository.initialize(settings);

      // Act
      const loaded = await repository.load();

      // Assert
      expect(loaded?.user).toEqual({
        name: 'Test User',
        email: 'test@example.com',
        githubUsername: 'testuser',
      });
    });

    it('should handle missing optional user fields in database', async () => {
      // Arrange - insert settings without optional user fields
      const settings = createTestSettings();
      settings.user = {};
      await repository.initialize(settings);

      // Act
      const loaded = await repository.load();

      // Assert
      expect(loaded?.user).toEqual({});
    });

    it('should correctly map environment configuration from database', async () => {
      // Arrange
      const settings = createTestSettings();
      await repository.initialize(settings);

      // Act
      const loaded = await repository.load();

      // Assert
      expect(loaded?.environment).toEqual({
        defaultEditor: 'vscode',
        shellPreference: 'zsh',
      });
    });

    it('should correctly map system configuration from database', async () => {
      // Arrange
      const settings = createTestSettings();
      await repository.initialize(settings);

      // Act
      const loaded = await repository.load();

      // Assert
      expect(loaded?.system).toEqual({
        autoUpdate: true,
        logLevel: 'info',
      });
    });

    it('should convert integer back to boolean for autoUpdate', async () => {
      // Arrange - create with autoUpdate = false
      const settings = createTestSettings();
      settings.system.autoUpdate = false;
      await repository.initialize(settings);

      // Act
      const loaded = await repository.load();

      // Assert
      expect(loaded?.system.autoUpdate).toBe(false);
      expect(typeof loaded?.system.autoUpdate).toBe('boolean');
    });

    it('should parse ISO 8601 timestamps back to Date objects', async () => {
      // Arrange
      const settings = createTestSettings();
      await repository.initialize(settings);

      // Act
      const loaded = await repository.load();

      // Assert
      expect(loaded?.createdAt).toBeInstanceOf(Date);
      expect(loaded?.updatedAt).toBeInstanceOf(Date);
      expect((loaded?.createdAt as Date).toISOString()).toBe('2025-01-01T00:00:00.000Z');
    });
  });

  describe('update()', () => {
    it('should update existing settings in database', async () => {
      // Arrange - initialize first
      const settings = createTestSettings();
      await repository.initialize(settings);

      // Modify settings
      settings.models.analyze = 'claude-opus-5';
      settings.user.name = 'Updated Name';
      settings.system.logLevel = 'debug';
      settings.updatedAt = new Date('2025-01-02T00:00:00Z');

      // Act
      await repository.update(settings);

      // Assert - verify updates in database
      const row = db.prepare('SELECT * FROM settings WHERE id = ?').get('singleton') as Record<
        string,
        unknown
      >;
      expect(row.model_analyze).toBe('claude-opus-5');
      expect(row.user_name).toBe('Updated Name');
      expect(row.sys_log_level).toBe('debug');
      expect(row.updated_at).toBe('2025-01-02T00:00:00.000Z');
    });

    it('should throw error when updating non-existent settings', async () => {
      // Arrange
      const settings = createTestSettings();

      // Act & Assert - should fail because settings not initialized
      await expect(repository.update(settings)).rejects.toThrow();
    });

    it('should update model configuration', async () => {
      // Arrange
      const settings = createTestSettings();
      await repository.initialize(settings);

      // Modify all model fields
      settings.models = {
        analyze: 'new-analyze-model',
        requirements: 'new-requirements-model',
        plan: 'new-plan-model',
        implement: 'new-implement-model',
      };

      // Act
      await repository.update(settings);

      // Assert
      const loaded = await repository.load();
      expect(loaded?.models).toEqual(settings.models);
    });

    it('should update user profile including optional fields', async () => {
      // Arrange
      const settings = createTestSettings();
      await repository.initialize(settings);

      // Modify user fields
      settings.user = {
        name: 'New Name',
        email: 'newemail@example.com',
        githubUsername: 'newusername',
      };

      // Act
      await repository.update(settings);

      // Assert
      const loaded = await repository.load();
      expect(loaded?.user).toEqual(settings.user);
    });

    it('should allow clearing optional user fields', async () => {
      // Arrange
      const settings = createTestSettings();
      await repository.initialize(settings);

      // Clear optional fields
      settings.user = {};

      // Act
      await repository.update(settings);

      // Assert
      const loaded = await repository.load();
      expect(loaded?.user).toEqual({});
    });

    it('should update environment configuration', async () => {
      // Arrange
      const settings = createTestSettings();
      await repository.initialize(settings);

      // Modify environment
      settings.environment = {
        defaultEditor: EditorType.Cursor,
        shellPreference: 'bash',
      };

      // Act
      await repository.update(settings);

      // Assert
      const loaded = await repository.load();
      expect(loaded?.environment).toEqual(settings.environment);
    });

    it('should update system configuration', async () => {
      // Arrange
      const settings = createTestSettings();
      await repository.initialize(settings);

      // Modify system config
      settings.system = {
        autoUpdate: false,
        logLevel: 'error',
      };

      // Act
      await repository.update(settings);

      // Assert
      const loaded = await repository.load();
      expect(loaded?.system).toEqual(settings.system);
    });

    it('should preserve createdAt and update updatedAt', async () => {
      // Arrange
      const settings = createTestSettings();
      await repository.initialize(settings);

      // Change updatedAt
      const originalCreatedAt = settings.createdAt;
      settings.updatedAt = new Date('2025-01-03T00:00:00Z');

      // Act
      await repository.update(settings);

      // Assert
      const loaded = await repository.load();
      expect(loaded?.createdAt).toEqual(originalCreatedAt);
      expect(loaded?.updatedAt).toEqual(new Date('2025-01-03T00:00:00Z'));
    });
  });

  describe('SQL injection prevention', () => {
    it('should safely handle user input with SQL special characters in name', async () => {
      // Arrange
      const settings = createTestSettings();
      settings.user.name = "Robert'; DROP TABLE settings;--";

      // Act
      await repository.initialize(settings);

      // Assert - table should still exist and data should be safe
      expect(tableExists(db, 'settings')).toBe(true);
      const loaded = await repository.load();
      expect(loaded?.user.name).toBe("Robert'; DROP TABLE settings;--");
    });

    it('should safely handle SQL special characters in email', async () => {
      // Arrange
      const settings = createTestSettings();
      settings.user.email = "test'@example.com";

      // Act
      await repository.initialize(settings);

      // Assert
      const loaded = await repository.load();
      expect(loaded?.user.email).toBe("test'@example.com");
    });

    it('should safely handle quotes in shell preference', async () => {
      // Arrange
      const settings = createTestSettings();
      settings.environment.shellPreference = 'ba\'"sh';

      // Act
      await repository.initialize(settings);

      // Assert
      const loaded = await repository.load();
      expect(loaded?.environment.shellPreference).toBe('ba\'"sh');
    });
  });

  describe('database mapping', () => {
    it('should use snake_case for database columns', async () => {
      // Arrange
      const settings = createTestSettings();

      // Act
      await repository.initialize(settings);

      // Assert - check that snake_case columns exist
      const row = db.prepare('SELECT * FROM settings WHERE id = ?').get('singleton') as Record<
        string,
        unknown
      >;
      expect(row).toHaveProperty('created_at');
      expect(row).toHaveProperty('updated_at');
      expect(row).toHaveProperty('model_analyze');
      expect(row).toHaveProperty('user_name');
      expect(row).toHaveProperty('env_default_editor');
      expect(row).toHaveProperty('sys_auto_update');
    });

    it('should flatten nested objects into columns', async () => {
      // Arrange
      const settings = createTestSettings();

      // Act
      await repository.initialize(settings);

      // Assert - nested objects should be flattened
      const row = db.prepare('SELECT * FROM settings WHERE id = ?').get('singleton') as Record<
        string,
        unknown
      >;

      // models.* -> model_*
      expect(row.model_analyze).toBeDefined();

      // user.* -> user_*
      expect(row.user_name).toBeDefined();

      // environment.* -> env_*
      expect(row.env_default_editor).toBeDefined();

      // system.* -> sys_*
      expect(row.sys_auto_update).toBeDefined();
    });

    it('should correctly convert boolean to integer for storage', async () => {
      // Arrange
      const settingsTrue = createTestSettings();
      settingsTrue.system.autoUpdate = true;

      const settingsFalse = createTestSettings();
      settingsFalse.id = 'test-false';
      settingsFalse.system.autoUpdate = false;

      // Act
      await repository.initialize(settingsTrue);

      // Assert
      const rowTrue = db
        .prepare('SELECT sys_auto_update FROM settings WHERE id = ?')
        .get('singleton') as { sys_auto_update: number };
      expect(rowTrue.sys_auto_update).toBe(1);
    });

    it('should correctly convert integer back to boolean when loading', async () => {
      // Arrange - manually insert with integer value
      db.prepare(
        `INSERT INTO settings (
          id, created_at, updated_at,
          model_analyze, model_requirements, model_plan, model_implement,
          env_default_editor, env_shell_preference,
          sys_auto_update, sys_log_level
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(
        'singleton',
        '2025-01-01T00:00:00.000Z',
        '2025-01-01T00:00:00.000Z',
        'model1',
        'model2',
        'model3',
        'model4',
        'vscode',
        'zsh',
        0, // false as integer
        'info'
      );

      // Act
      const loaded = await repository.load();

      // Assert
      expect(loaded?.system.autoUpdate).toBe(false);
      expect(typeof loaded?.system.autoUpdate).toBe('boolean');
    });
  });
});
