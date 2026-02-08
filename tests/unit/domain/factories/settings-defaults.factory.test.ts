/**
 * Settings Defaults Factory Unit Tests
 *
 * Tests for the createDefaultSettings factory function that generates
 * Settings entities with sensible defaults matching the TypeSpec model.
 *
 * TDD Phase: RED
 * - These tests are written BEFORE implementation
 * - All tests should FAIL initially (factory doesn't exist yet)
 */

import { describe, it, expect } from 'vitest';
import { createDefaultSettings } from '../../../../src/domain/factories/settings-defaults.factory.js';
import type {
  Settings,
  ModelConfiguration,
  UserProfile,
  EnvironmentConfig,
  SystemConfig,
} from '../../../../src/domain/generated/output.js';
import { AgentType, AgentAuthMethod } from '../../../../src/domain/generated/output.js';

describe('createDefaultSettings', () => {
  describe('return type and structure', () => {
    it('should return an object with all required fields', () => {
      // Act
      const settings = createDefaultSettings();

      // Assert
      expect(settings).toBeDefined();
      expect(settings).toHaveProperty('id');
      expect(settings).toHaveProperty('models');
      expect(settings).toHaveProperty('user');
      expect(settings).toHaveProperty('environment');
      expect(settings).toHaveProperty('system');
      expect(settings).toHaveProperty('createdAt');
      expect(settings).toHaveProperty('updatedAt');
    });

    it('should return a Settings type that matches generated types', () => {
      // Act
      const settings: Settings = createDefaultSettings();

      // Assert - TypeScript compilation validates the type
      expect(settings).toBeDefined();
    });

    it('should generate unique IDs for each call', () => {
      // Act
      const settings1 = createDefaultSettings();
      const settings2 = createDefaultSettings();

      // Assert
      expect(settings1.id).not.toBe(settings2.id);
      expect(settings1.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      );
      expect(settings2.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      );
    });

    it('should set createdAt and updatedAt timestamps', () => {
      // Arrange
      const beforeCreation = new Date();

      // Act
      const settings = createDefaultSettings();

      // Assert
      const afterCreation = new Date();
      expect(settings.createdAt).toBeInstanceOf(Date);
      expect(settings.updatedAt).toBeInstanceOf(Date);
      expect(settings.createdAt.getTime()).toBeGreaterThanOrEqual(beforeCreation.getTime());
      expect(settings.createdAt.getTime()).toBeLessThanOrEqual(afterCreation.getTime());
      expect(settings.updatedAt).toEqual(settings.createdAt);
    });
  });

  describe('ModelConfiguration defaults', () => {
    it('should set all model fields to "claude-sonnet-4-5"', () => {
      // Act
      const settings = createDefaultSettings();
      const models: ModelConfiguration = settings.models;

      // Assert
      expect(models).toBeDefined();
      expect(models.analyze).toBe('claude-sonnet-4-5');
      expect(models.requirements).toBe('claude-sonnet-4-5');
      expect(models.plan).toBe('claude-sonnet-4-5');
      expect(models.implement).toBe('claude-sonnet-4-5');
    });

    it('should match TypeSpec model defaults', () => {
      // Act
      const settings = createDefaultSettings();

      // Assert - Verify all fields match TypeSpec defaults
      expect(settings.models).toEqual({
        analyze: 'claude-sonnet-4-5',
        requirements: 'claude-sonnet-4-5',
        plan: 'claude-sonnet-4-5',
        implement: 'claude-sonnet-4-5',
      });
    });
  });

  describe('UserProfile defaults', () => {
    it('should set all user fields to undefined (optional fields)', () => {
      // Act
      const settings = createDefaultSettings();
      const user: UserProfile = settings.user;

      // Assert
      expect(user).toBeDefined();
      expect(user.name).toBeUndefined();
      expect(user.email).toBeUndefined();
      expect(user.githubUsername).toBeUndefined();
    });

    it('should return empty UserProfile object', () => {
      // Act
      const settings = createDefaultSettings();

      // Assert
      expect(settings.user).toEqual({});
    });
  });

  describe('EnvironmentConfig defaults', () => {
    it('should set defaultEditor to "vscode"', () => {
      // Act
      const settings = createDefaultSettings();
      const environment: EnvironmentConfig = settings.environment;

      // Assert
      expect(environment).toBeDefined();
      expect(environment.defaultEditor).toBe('vscode');
    });

    it('should set shellPreference to "bash"', () => {
      // Act
      const settings = createDefaultSettings();

      // Assert
      expect(settings.environment.shellPreference).toBe('bash');
    });

    it('should match TypeSpec model defaults', () => {
      // Act
      const settings = createDefaultSettings();

      // Assert
      expect(settings.environment).toEqual({
        defaultEditor: 'vscode',
        shellPreference: 'bash',
      });
    });
  });

  describe('SystemConfig defaults', () => {
    it('should set autoUpdate to true', () => {
      // Act
      const settings = createDefaultSettings();
      const system: SystemConfig = settings.system;

      // Assert
      expect(system).toBeDefined();
      expect(system.autoUpdate).toBe(true);
    });

    it('should set logLevel to "info"', () => {
      // Act
      const settings = createDefaultSettings();

      // Assert
      expect(settings.system.logLevel).toBe('info');
    });

    it('should match TypeSpec model defaults', () => {
      // Act
      const settings = createDefaultSettings();

      // Assert
      expect(settings.system).toEqual({
        autoUpdate: true,
        logLevel: 'info',
      });
    });
  });

  describe('AgentConfig defaults', () => {
    it('should have agent field defined', () => {
      // Act
      const settings = createDefaultSettings();

      // Assert
      expect(settings.agent).toBeDefined();
    });

    it('should set agent type to claude-code', () => {
      // Act
      const settings = createDefaultSettings();

      // Assert
      expect(settings.agent.type).toBe(AgentType.ClaudeCode);
    });

    it('should set agent authMethod to session', () => {
      // Act
      const settings = createDefaultSettings();

      // Assert
      expect(settings.agent.authMethod).toBe(AgentAuthMethod.Session);
    });

    it('should have token as undefined', () => {
      // Act
      const settings = createDefaultSettings();

      // Assert
      expect(settings.agent.token).toBeUndefined();
    });

    it('should match TypeSpec model defaults', () => {
      // Act
      const settings = createDefaultSettings();

      // Assert
      expect(settings.agent).toEqual({
        type: AgentType.ClaudeCode,
        authMethod: AgentAuthMethod.Session,
      });
    });
  });

  describe('complete default object', () => {
    it('should return complete Settings object matching all TypeSpec defaults', () => {
      // Act
      const settings = createDefaultSettings();

      // Assert - Verify entire structure (except id and timestamps)
      expect(settings.models).toEqual({
        analyze: 'claude-sonnet-4-5',
        requirements: 'claude-sonnet-4-5',
        plan: 'claude-sonnet-4-5',
        implement: 'claude-sonnet-4-5',
      });
      expect(settings.user).toEqual({});
      expect(settings.environment).toEqual({
        defaultEditor: 'vscode',
        shellPreference: 'bash',
      });
      expect(settings.system).toEqual({
        autoUpdate: true,
        logLevel: 'info',
      });
      expect(settings.agent).toEqual({
        type: AgentType.ClaudeCode,
        authMethod: AgentAuthMethod.Session,
      });
    });
  });
});
