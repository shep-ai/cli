/**
 * Init Command Unit Tests
 *
 * Tests for the `shep settings init` command.
 *
 * TDD Phase: RED
 * - These tests are written BEFORE implementation
 * - All tests should FAIL initially (init command doesn't exist yet)
 */

import 'reflect-metadata';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createDefaultSettings } from '../../../../../../src/domain/factories/settings-defaults.factory.js';
import { Command } from 'commander';

// Mock the settings service
vi.mock('../../../../../../src/infrastructure/services/settings.service.js', () => ({
  getSettings: vi.fn(),
  resetSettings: vi.fn(),
  initializeSettings: vi.fn(),
}));

// Mock the DI container
vi.mock('../../../../../../src/infrastructure/di/container.js', () => ({
  container: {
    resolve: vi.fn(),
  },
}));

import { container } from '../../../../../../src/infrastructure/di/container.js';

// This import will fail because the init command doesn't exist yet
import { createInitCommand } from '../../../../../../src/presentation/cli/commands/settings/init.command.js';

describe('Init Command', () => {
  const mockSettings = createDefaultSettings();

  beforeEach(() => {
    vi.clearAllMocks();
    (container.resolve as ReturnType<typeof vi.fn>).mockReturnValue({
      execute: vi.fn().mockResolvedValue(mockSettings),
    });
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
      const mockExecute = vi.fn().mockResolvedValue(mockSettings);
      (container.resolve as ReturnType<typeof vi.fn>).mockReturnValue({
        execute: mockExecute,
      });

      const cmd = createInitCommand();
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(vi.fn());
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(vi.fn());

      await cmd.parseAsync(['--force'], { from: 'user' });

      // Should have called the use case without prompting
      expect(mockExecute).toHaveBeenCalled();
      consoleSpy.mockRestore();
      errorSpy.mockRestore();
    });
  });

  describe('error handling', () => {
    it('should handle initialization errors', async () => {
      (container.resolve as ReturnType<typeof vi.fn>).mockReturnValue({
        execute: vi.fn().mockRejectedValue(new Error('Database error')),
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
