/**
 * Init Command Unit Tests
 *
 * Tests for the `shep settings init` command.
 *
 * TDD Phase: GREEN
 * - Tests updated to match actual implementation (settings service, not use case)
 */

import 'reflect-metadata';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Command } from 'commander';
import { createMockLogger } from '../../../../../helpers/mock-logger.js';

// Mock the DI container - factory must not reference outer variables (hoisted)
vi.mock('../../../../../../src/infrastructure/di/container.js', () => ({
  container: {
    resolve: vi.fn(),
  },
}));

// Mock the settings service
vi.mock('../../../../../../src/infrastructure/services/settings.service.js', () => ({
  getSettings: vi.fn(),
  resetSettings: vi.fn(),
  initializeSettings: vi.fn(),
}));

// Mock the domain factory
vi.mock('../../../../../../src/domain/factories/settings-defaults.factory.js', () => ({
  createDefaultSettings: vi.fn().mockReturnValue({ id: 'test-id', models: {} }),
}));

import { container } from '../../../../../../src/infrastructure/di/container.js';
import {
  resetSettings,
  initializeSettings,
} from '../../../../../../src/infrastructure/services/settings.service.js';
import { createInitCommand } from '../../../../../../src/presentation/cli/commands/settings/init.command.js';

describe('Init Command', () => {
  const mockLogger = createMockLogger();

  beforeEach(() => {
    vi.clearAllMocks();
    (container.resolve as ReturnType<typeof vi.fn>).mockReturnValue(mockLogger);
  });

  describe('command structure', () => {
    it('should create a valid Commander command', () => {
      const cmd = createInitCommand();
      expect(cmd).toBeInstanceOf(Command);
      expect(cmd.name()).toBe('init');
    });

    it('should have a --force option', () => {
      const cmd = createInitCommand();
      const forceOption = cmd.options.find((o) => o.long === '--force');
      expect(forceOption).toBeDefined();
    });
  });

  describe('--force flag', () => {
    it('should skip confirmation when --force is used', async () => {
      const cmd = createInitCommand();
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(vi.fn());
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(vi.fn());

      await cmd.parseAsync(['--force'], { from: 'user' });

      // Should have called resetSettings and initializeSettings without prompting
      expect(resetSettings).toHaveBeenCalled();
      expect(initializeSettings).toHaveBeenCalled();
      consoleSpy.mockRestore();
      errorSpy.mockRestore();
    });
  });

  describe('error handling', () => {
    it('should handle initialization errors', async () => {
      (resetSettings as ReturnType<typeof vi.fn>).mockImplementation(() => {
        throw new Error('Database error');
      });

      const cmd = createInitCommand();
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(vi.fn());
      const logSpy = vi.spyOn(console, 'log').mockImplementation(vi.fn());

      await cmd.parseAsync(['--force'], { from: 'user' });

      expect(process.exitCode).toBe(1);
      errorSpy.mockRestore();
      logSpy.mockRestore();

      process.exitCode = undefined;
    });
  });
});
