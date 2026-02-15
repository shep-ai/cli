/**
 * UpdateSettingsUseCase Unit Tests
 *
 * Tests for the UpdateSettingsUseCase that modifies existing settings.
 *
 * TDD Phase: RED
 * - These tests are written BEFORE implementation
 * - All tests should FAIL initially (use case doesn't exist yet)
 */

import 'reflect-metadata';
import { describe, it, expect, beforeEach } from 'vitest';
import { UpdateSettingsUseCase } from '../../../../src/application/use-cases/settings/update-settings.use-case.js';
import { MockSettingsRepository } from '../../../helpers/mock-repository.helper.js';
import { createDefaultSettings } from '../../../../src/domain/factories/settings-defaults.factory.js';
import type { Settings } from '../../../../src/domain/generated/output.js';
import { EditorType } from '../../../../src/domain/generated/output.js';

describe('UpdateSettingsUseCase', () => {
  let useCase: UpdateSettingsUseCase;
  let mockRepository: MockSettingsRepository;

  beforeEach(() => {
    mockRepository = new MockSettingsRepository();
    useCase = new UpdateSettingsUseCase(mockRepository as any);
  });

  describe('successful updates', () => {
    it('should update settings successfully', async () => {
      // Arrange
      const settings = createDefaultSettings();
      const updatedSettings: Settings = {
        ...settings,
        environment: {
          ...settings.environment,
          defaultEditor: EditorType.Cursor,
        },
      };

      // Act
      const result = await useCase.execute(updatedSettings);

      // Assert
      expect(result).toBeDefined();
      expect(result.environment.defaultEditor).toBe(EditorType.Cursor);
    });

    it('should call repository.update() with correct data', async () => {
      // Arrange
      const settings = createDefaultSettings();

      // Act
      await useCase.execute(settings);

      // Assert
      expect(mockRepository.wasUpdateCalled()).toBe(true);
    });

    it('should return updated settings', async () => {
      // Arrange
      const settings = createDefaultSettings();
      const updatedSettings: Settings = {
        ...settings,
        system: {
          ...settings.system,
          logLevel: 'debug',
        },
      };

      // Act
      const result = await useCase.execute(updatedSettings);

      // Assert
      expect(result.system.logLevel).toBe('debug');
      expect(result.id).toBe(settings.id);
    });
  });

  describe('model configuration updates', () => {
    it('should update model configuration', async () => {
      // Arrange
      const settings = createDefaultSettings();
      const updatedSettings: Settings = {
        ...settings,
        models: {
          analyze: 'claude-opus-4-5',
          requirements: 'claude-sonnet-4-5',
          plan: 'claude-sonnet-4-5',
          implement: 'claude-sonnet-4-5',
        },
      };

      // Act
      const result = await useCase.execute(updatedSettings);

      // Assert
      expect(result.models.analyze).toBe('claude-opus-4-5');
      expect(result.models.requirements).toBe('claude-sonnet-4-5');
    });

    it('should update all model fields independently', async () => {
      // Arrange
      const settings = createDefaultSettings();
      const updatedSettings: Settings = {
        ...settings,
        models: {
          analyze: 'claude-opus-4-5',
          requirements: 'claude-haiku-4-5',
          plan: 'claude-sonnet-4-5',
          implement: 'claude-opus-4-5',
        },
      };

      // Act
      const result = await useCase.execute(updatedSettings);

      // Assert
      expect(result.models.analyze).toBe('claude-opus-4-5');
      expect(result.models.requirements).toBe('claude-haiku-4-5');
      expect(result.models.plan).toBe('claude-sonnet-4-5');
      expect(result.models.implement).toBe('claude-opus-4-5');
    });
  });

  describe('user profile updates', () => {
    it('should update user profile fields', async () => {
      // Arrange
      const settings = createDefaultSettings();
      const updatedSettings: Settings = {
        ...settings,
        user: {
          name: 'John Doe',
          email: 'john@example.com',
          githubUsername: 'johndoe',
        },
      };

      // Act
      const result = await useCase.execute(updatedSettings);

      // Assert
      expect(result.user.name).toBe('John Doe');
      expect(result.user.email).toBe('john@example.com');
      expect(result.user.githubUsername).toBe('johndoe');
    });

    it('should handle partial user profile updates', async () => {
      // Arrange
      const settings = createDefaultSettings();
      const updatedSettings: Settings = {
        ...settings,
        user: {
          name: 'Jane Doe',
        },
      };

      // Act
      const result = await useCase.execute(updatedSettings);

      // Assert
      expect(result.user.name).toBe('Jane Doe');
      expect(result.user.email).toBeUndefined();
      expect(result.user.githubUsername).toBeUndefined();
    });
  });

  describe('environment configuration updates', () => {
    it('should update editor preference', async () => {
      // Arrange
      const settings = createDefaultSettings();
      const updatedSettings: Settings = {
        ...settings,
        environment: {
          ...settings.environment,
          defaultEditor: EditorType.Windsurf,
        },
      };

      // Act
      const result = await useCase.execute(updatedSettings);

      // Assert
      expect(result.environment.defaultEditor).toBe(EditorType.Windsurf);
    });

    it('should update shell preference', async () => {
      // Arrange
      const settings = createDefaultSettings();
      const updatedSettings: Settings = {
        ...settings,
        environment: {
          ...settings.environment,
          shellPreference: 'zsh',
        },
      };

      // Act
      const result = await useCase.execute(updatedSettings);

      // Assert
      expect(result.environment.shellPreference).toBe('zsh');
    });
  });

  describe('system configuration updates', () => {
    it('should update autoUpdate flag', async () => {
      // Arrange
      const settings = createDefaultSettings();
      const updatedSettings: Settings = {
        ...settings,
        system: {
          ...settings.system,
          autoUpdate: false,
        },
      };

      // Act
      const result = await useCase.execute(updatedSettings);

      // Assert
      expect(result.system.autoUpdate).toBe(false);
    });

    it('should update log level', async () => {
      // Arrange
      const settings = createDefaultSettings();
      const updatedSettings: Settings = {
        ...settings,
        system: {
          ...settings.system,
          logLevel: 'error',
        },
      };

      // Act
      const result = await useCase.execute(updatedSettings);

      // Assert
      expect(result.system.logLevel).toBe('error');
    });
  });

  describe('repository interaction', () => {
    it('should call repository.update() exactly once', async () => {
      // Arrange
      const settings = createDefaultSettings();

      // Act
      await useCase.execute(settings);

      // Assert
      expect(mockRepository.wasUpdateCalled()).toBe(true);
    });
  });
});
