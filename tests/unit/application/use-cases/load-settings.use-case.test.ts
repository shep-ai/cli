/**
 * LoadSettingsUseCase Unit Tests
 *
 * Tests for the LoadSettingsUseCase that retrieves existing settings.
 *
 * TDD Phase: RED
 * - These tests are written BEFORE implementation
 * - All tests should FAIL initially (use case doesn't exist yet)
 */

import 'reflect-metadata';
import { describe, it, expect, beforeEach } from 'vitest';
import { LoadSettingsUseCase } from '../../../../src/application/use-cases/settings/load-settings.use-case.js';
import { MockSettingsRepository } from '../../../helpers/mock-repository.helper.js';
import { createDefaultSettings } from '../../../../src/domain/factories/settings-defaults.factory.js';
import { createMockLogger } from '../../../helpers/mock-logger.js';
import type { ILogger } from '../../../../src/application/ports/output/logger.interface.js';

describe('LoadSettingsUseCase', () => {
  let useCase: LoadSettingsUseCase;
  let mockRepository: MockSettingsRepository;
  let mockLogger: ILogger;

  beforeEach(() => {
    mockRepository = new MockSettingsRepository();
    mockLogger = createMockLogger();
    useCase = new LoadSettingsUseCase(mockRepository as any, mockLogger);
  });

  describe('when settings exist', () => {
    it('should load settings successfully', async () => {
      // Arrange
      const existingSettings = createDefaultSettings();
      mockRepository.setSettings(existingSettings);

      // Act
      const result = await useCase.execute();

      // Assert
      expect(result).toBeDefined();
      expect(result.id).toBe(existingSettings.id);
      expect(result.models).toEqual(existingSettings.models);
      expect(result.environment).toEqual(existingSettings.environment);
      expect(result.system).toEqual(existingSettings.system);
    });

    it('should return correct Settings type', async () => {
      // Arrange
      const existingSettings = createDefaultSettings();
      mockRepository.setSettings(existingSettings);

      // Act
      const result = await useCase.execute();

      // Assert - TypeScript compilation validates the type
      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('models');
      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('environment');
      expect(result).toHaveProperty('system');
      expect(result).toHaveProperty('createdAt');
      expect(result).toHaveProperty('updatedAt');
    });

    it('should call repository.load()', async () => {
      // Arrange
      const existingSettings = createDefaultSettings();
      mockRepository.setSettings(existingSettings);

      // Act
      await useCase.execute();

      // Assert
      expect(mockRepository.wasLoadCalled()).toBe(true);
    });
  });

  describe('when settings do not exist', () => {
    it('should throw error when settings are missing', async () => {
      // Arrange
      mockRepository.setSettings(null);

      // Act & Assert
      await expect(useCase.execute()).rejects.toThrow(
        'Settings not found. Please run initialization first.'
      );
    });

    it('should include helpful error message', async () => {
      // Arrange
      mockRepository.setSettings(null);

      // Act & Assert
      await expect(useCase.execute()).rejects.toThrow(/initialization/i);
    });
  });

  describe('repository interaction', () => {
    it('should call repository.load() exactly once', async () => {
      // Arrange
      const existingSettings = createDefaultSettings();
      mockRepository.setSettings(existingSettings);

      // Act
      await useCase.execute();

      // Assert
      expect(mockRepository.wasLoadCalled()).toBe(true);
    });
  });
});
