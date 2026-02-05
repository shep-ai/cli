/**
 * Show Command Unit Tests
 *
 * Tests for the `shep settings show` command.
 *
 * TDD Phase: GREEN
 * - Tests now verify actual show command behavior
 */

import 'reflect-metadata';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createDefaultSettings } from '../../../../../../src/domain/factories/settings-defaults.factory.js';
import { Command } from 'commander';

// Mock the settings service - factory must not reference outer variables (hoisted)
vi.mock('../../../../../../src/infrastructure/services/settings.service.js', () => ({
  getSettings: vi.fn(),
}));

// Mock the shep directory service
vi.mock(
  '../../../../../../src/infrastructure/services/filesystem/shep-directory.service.js',
  () => ({
    getShepDbPath: vi.fn().mockReturnValue('/home/test/.shep/data'),
  })
);

import { getSettings } from '../../../../../../src/infrastructure/services/settings.service.js';
import { createShowCommand } from '../../../../../../src/presentation/cli/commands/settings/show.command.js';

describe('Show Command', () => {
  const mockSettings = createDefaultSettings();

  beforeEach(() => {
    vi.clearAllMocks();
    (getSettings as ReturnType<typeof vi.fn>).mockReturnValue(mockSettings);
  });

  describe('command execution', () => {
    it('should create a valid Commander command', () => {
      const cmd = createShowCommand();
      expect(cmd).toBeInstanceOf(Command);
      expect(cmd.name()).toBe('show');
    });
  });

  describe('output format handling', () => {
    it('should default to table format', () => {
      const cmd = createShowCommand();
      const outputOption = cmd.options.find((o) => o.long === '--output');
      expect(outputOption).toBeDefined();
      expect(outputOption!.defaultValue).toBe('table');
    });

    it('should handle --output json flag', () => {
      const cmd = createShowCommand();
      const outputOption = cmd.options.find((o) => o.long === '--output');
      expect(outputOption).toBeDefined();
      expect(outputOption!.argChoices).toContain('json');
    });

    it('should handle --output yaml flag', () => {
      const cmd = createShowCommand();
      const outputOption = cmd.options.find((o) => o.long === '--output');
      expect(outputOption).toBeDefined();
      expect(outputOption!.argChoices).toContain('yaml');
    });
  });

  describe('use case integration', () => {
    it('should call getSettings() to retrieve settings', async () => {
      const cmd = createShowCommand();
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(vi.fn());

      await cmd.parseAsync(['--output', 'json'], { from: 'user' });

      expect(getSettings).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('error handling', () => {
    it('should handle settings not found error', async () => {
      (getSettings as ReturnType<typeof vi.fn>).mockImplementation(() => {
        throw new Error('Settings not initialized');
      });

      const cmd = createShowCommand();
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(vi.fn());
      const logSpy = vi.spyOn(console, 'log').mockImplementation(vi.fn());

      await cmd.parseAsync(['--output', 'json'], { from: 'user' });

      expect(process.exitCode).toBe(1);
      errorSpy.mockRestore();
      logSpy.mockRestore();

      // Reset exitCode for other tests
      process.exitCode = undefined;
    });
  });
});
