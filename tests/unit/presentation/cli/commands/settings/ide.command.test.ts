/**
 * IDE Command Unit Tests
 *
 * Tests for the `shep settings ide` command.
 */

import 'reflect-metadata';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Command } from 'commander';

const { mockMessages, mockCheckAvailable } = vi.hoisted(() => ({
  mockMessages: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
  },
  mockCheckAvailable: vi.fn(),
}));

// Mock the container
vi.mock('../../../../../../src/infrastructure/di/container.js', () => ({
  container: {
    resolve: vi.fn(),
  },
}));

// Mock @inquirer/prompts select
vi.mock('@inquirer/prompts', () => ({
  select: vi.fn(),
}));

// Mock the settings service
vi.mock('../../../../../../src/infrastructure/services/settings.service.js', () => ({
  getSettings: vi.fn(),
  initializeSettings: vi.fn(),
  resetSettings: vi.fn(),
}));

// Mock the UI messages module
vi.mock('../../../../../../src/presentation/cli/ui/index.js', () => ({
  messages: mockMessages,
}));

// Mock the launcher registry
vi.mock(
  '../../../../../../src/infrastructure/services/ide-launchers/ide-launcher.registry.js',
  () => ({
    createLauncherRegistry: vi.fn(() => {
      const launcher = {
        name: 'VS Code',
        editorId: 'vscode',
        binary: 'code',
        launch: vi.fn(),
        checkAvailable: mockCheckAvailable,
      };
      const map = new Map();
      map.set('vscode', launcher);
      map.set('cursor', {
        ...launcher,
        name: 'Cursor',
        editorId: 'cursor',
        binary: 'cursor',
        checkAvailable: mockCheckAvailable,
      });
      map.set('windsurf', {
        ...launcher,
        name: 'Windsurf',
        editorId: 'windsurf',
        binary: 'windsurf',
        checkAvailable: mockCheckAvailable,
      });
      map.set('zed', {
        ...launcher,
        name: 'Zed',
        editorId: 'zed',
        binary: 'zed',
        checkAvailable: mockCheckAvailable,
      });
      map.set('antigravity', {
        ...launcher,
        name: 'Antigravity',
        editorId: 'antigravity',
        binary: 'agy',
        checkAvailable: mockCheckAvailable,
      });
      return map;
    }),
  })
);

import { container } from '../../../../../../src/infrastructure/di/container.js';
import { select } from '@inquirer/prompts';
import {
  getSettings,
  initializeSettings,
  resetSettings,
} from '../../../../../../src/infrastructure/services/settings.service.js';
import { createIdeCommand } from '../../../../../../src/presentation/cli/commands/settings/ide.command.js';

describe('IDE Command', () => {
  const mockSettings = {
    id: 'test-id',
    models: {
      analyze: 'claude-sonnet-4-5',
      requirements: 'claude-sonnet-4-5',
      plan: 'claude-sonnet-4-5',
      implement: 'claude-sonnet-4-5',
    },
    user: {},
    environment: { defaultEditor: 'vscode', shellPreference: 'bash' },
    system: { autoUpdate: true, logLevel: 'info' },
    agent: { type: 'claude-code', authMethod: 'session' },
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockUpdateUseCase = { execute: vi.fn() };

  beforeEach(() => {
    vi.clearAllMocks();
    process.exitCode = undefined;
    (container.resolve as ReturnType<typeof vi.fn>).mockReturnValue(mockUpdateUseCase);
    (getSettings as ReturnType<typeof vi.fn>).mockReturnValue({
      ...mockSettings,
      environment: { ...mockSettings.environment },
    });
    mockUpdateUseCase.execute.mockResolvedValue(mockSettings);
    // Default: binary found in PATH
    mockCheckAvailable.mockResolvedValue(true);
  });

  describe('command structure', () => {
    it('should create a valid Commander command', () => {
      const cmd = createIdeCommand();
      expect(cmd).toBeInstanceOf(Command);
      expect(cmd.name()).toBe('ide');
    });

    it('should have --editor option', () => {
      const cmd = createIdeCommand();
      const opt = cmd.options.find((o) => o.long === '--editor');
      expect(opt).toBeDefined();
    });
  });

  describe('interactive mode (prompt)', () => {
    it('should show select prompt when no flags provided', async () => {
      (select as ReturnType<typeof vi.fn>).mockResolvedValue('cursor');

      const cmd = createIdeCommand();
      await cmd.parseAsync([], { from: 'user' });

      expect(select).toHaveBeenCalled();
    });

    it('should persist selected IDE via UpdateSettingsUseCase', async () => {
      (select as ReturnType<typeof vi.fn>).mockResolvedValue('cursor');

      const cmd = createIdeCommand();
      await cmd.parseAsync([], { from: 'user' });

      expect(mockUpdateUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          environment: expect.objectContaining({ defaultEditor: 'cursor' }),
        })
      );
    });

    it('should refresh in-memory singleton after save', async () => {
      (select as ReturnType<typeof vi.fn>).mockResolvedValue('zed');

      const cmd = createIdeCommand();
      await cmd.parseAsync([], { from: 'user' });

      expect(resetSettings).toHaveBeenCalled();
      expect(initializeSettings).toHaveBeenCalledWith(mockSettings);
    });
  });

  describe('non-interactive mode (--editor flag)', () => {
    it('should save directly without prompt when --editor provided', async () => {
      const cmd = createIdeCommand();
      await cmd.parseAsync(['--editor', 'windsurf'], { from: 'user' });

      expect(select).not.toHaveBeenCalled();
      expect(mockUpdateUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          environment: expect.objectContaining({ defaultEditor: 'windsurf' }),
        })
      );
    });
  });

  describe('PATH validation warning', () => {
    it('should warn when IDE binary not found in PATH', async () => {
      mockCheckAvailable.mockResolvedValue(false);

      const cmd = createIdeCommand();
      await cmd.parseAsync(['--editor', 'vscode'], { from: 'user' });

      // Should still save (non-blocking)
      expect(mockUpdateUseCase.execute).toHaveBeenCalled();
      // Warning about PATH
      expect(mockMessages.warning).toHaveBeenCalledWith(
        expect.stringContaining('not found in PATH')
      );
    });

    it('should not warn when IDE binary IS found in PATH', async () => {
      const cmd = createIdeCommand();
      await cmd.parseAsync(['--editor', 'vscode'], { from: 'user' });

      expect(mockUpdateUseCase.execute).toHaveBeenCalled();
      expect(mockMessages.warning).not.toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should handle Ctrl+C cancellation gracefully', async () => {
      (select as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('User force closed the prompt')
      );

      const cmd = createIdeCommand();
      await cmd.parseAsync([], { from: 'user' });

      expect(process.exitCode).toBeUndefined();
      expect(mockMessages.info).toHaveBeenCalledWith('Configuration cancelled.');
    });

    it('should handle use case errors gracefully', async () => {
      mockUpdateUseCase.execute.mockRejectedValue(new Error('DB write failed'));

      const cmd = createIdeCommand();
      await cmd.parseAsync(['--editor', 'vscode'], { from: 'user' });

      expect(process.exitCode).toBe(1);
      expect(mockMessages.error).toHaveBeenCalled();
      process.exitCode = undefined;
    });
  });
});
