/**
 * Experimental Command Unit Tests
 *
 * Tests for the `shep settings experimental` command group
 * with list/enable/disable subcommands.
 */

import 'reflect-metadata';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Command } from 'commander';

const { mockMessages } = vi.hoisted(() => ({
  mockMessages: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
    newline: vi.fn(),
    log: vi.fn(),
  },
}));

const mockUpdateUseCase = { execute: vi.fn() };

vi.mock('@/infrastructure/di/container.js', () => ({
  container: {
    resolve: vi.fn(() => mockUpdateUseCase),
  },
}));

vi.mock('@/infrastructure/services/settings.service.js', () => ({
  getSettings: vi.fn(),
  initializeSettings: vi.fn(),
  resetSettings: vi.fn(),
}));

vi.mock('../../../../../../src/presentation/cli/ui/index.js', () => ({
  messages: mockMessages,
}));

import {
  getSettings,
  initializeSettings,
  resetSettings,
} from '@/infrastructure/services/settings.service.js';
import { createExperimentalCommand } from '../../../../../../src/presentation/cli/commands/settings/experimental.command.js';

describe('Experimental Command', () => {
  const createMockSettings = (skillsEnabled = false) => ({
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
    notifications: {
      inApp: { enabled: true },
      browser: { enabled: true },
      desktop: { enabled: true },
      events: {
        agentStarted: true,
        phaseCompleted: true,
        waitingApproval: true,
        agentCompleted: true,
        agentFailed: true,
        prMerged: true,
        prClosed: true,
        prChecksPassed: true,
        prChecksFailed: true,
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
    experimental: { skills: skillsEnabled },
    onboardingComplete: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  beforeEach(() => {
    vi.clearAllMocks();
    process.exitCode = undefined;
    (getSettings as ReturnType<typeof vi.fn>).mockReturnValue(createMockSettings());
    mockUpdateUseCase.execute.mockResolvedValue(createMockSettings());
  });

  describe('command structure', () => {
    it('should create a valid Commander command named "experimental"', () => {
      const cmd = createExperimentalCommand();
      expect(cmd).toBeInstanceOf(Command);
      expect(cmd.name()).toBe('experimental');
    });

    it('should have list, enable, and disable subcommands', () => {
      const cmd = createExperimentalCommand();
      const subcommandNames = cmd.commands.map((c) => c.name());
      expect(subcommandNames).toContain('list');
      expect(subcommandNames).toContain('enable');
      expect(subcommandNames).toContain('disable');
    });
  });

  describe('list subcommand', () => {
    it('should output flag names and descriptions', async () => {
      const cmd = createExperimentalCommand();
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(vi.fn());

      await cmd.parseAsync(['list'], { from: 'user' });

      expect(consoleSpy).toHaveBeenCalled();
      const output = consoleSpy.mock.calls.map((c) => c[0]).join('\n');
      expect(output).toContain('Skills Page');
      expect(output).toContain('Enable the experimental skills management page');
      consoleSpy.mockRestore();
    });

    it('should show disabled status when flag is off', async () => {
      const cmd = createExperimentalCommand();
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(vi.fn());

      await cmd.parseAsync(['list'], { from: 'user' });

      const output = consoleSpy.mock.calls.map((c) => c[0]).join('\n');
      expect(output).toContain('disabled');
      consoleSpy.mockRestore();
    });

    it('should show enabled status when flag is on', async () => {
      (getSettings as ReturnType<typeof vi.fn>).mockReturnValue(createMockSettings(true));

      const cmd = createExperimentalCommand();
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(vi.fn());

      await cmd.parseAsync(['list'], { from: 'user' });

      const output = consoleSpy.mock.calls.map((c) => c[0]).join('\n');
      expect(output).toContain('enabled');
      consoleSpy.mockRestore();
    });
  });

  describe('enable subcommand', () => {
    it('should enable a valid flag and persist via UpdateSettingsUseCase', async () => {
      const cmd = createExperimentalCommand();

      await cmd.parseAsync(['enable', 'skills'], { from: 'user' });

      expect(mockUpdateUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          experimental: expect.objectContaining({ skills: true }),
        })
      );
    });

    it('should refresh in-memory singleton after enable', async () => {
      const cmd = createExperimentalCommand();

      await cmd.parseAsync(['enable', 'skills'], { from: 'user' });

      expect(resetSettings).toHaveBeenCalled();
      expect(initializeSettings).toHaveBeenCalled();
    });

    it('should show success message after enabling', async () => {
      const cmd = createExperimentalCommand();

      await cmd.parseAsync(['enable', 'skills'], { from: 'user' });

      expect(mockMessages.success).toHaveBeenCalledWith(expect.stringContaining('skills'));
    });

    it('should produce error for invalid flag name', async () => {
      const cmd = createExperimentalCommand();

      await cmd.parseAsync(['enable', 'nonexistent'], { from: 'user' });

      expect(mockMessages.error).toHaveBeenCalledWith(expect.stringContaining('nonexistent'));
      expect(mockMessages.error).toHaveBeenCalledWith(expect.stringContaining('list'));
      expect(mockUpdateUseCase.execute).not.toHaveBeenCalled();
    });
  });

  describe('disable subcommand', () => {
    it('should disable a valid flag and persist via UpdateSettingsUseCase', async () => {
      (getSettings as ReturnType<typeof vi.fn>).mockReturnValue(createMockSettings(true));
      const cmd = createExperimentalCommand();

      await cmd.parseAsync(['disable', 'skills'], { from: 'user' });

      expect(mockUpdateUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          experimental: expect.objectContaining({ skills: false }),
        })
      );
    });

    it('should refresh in-memory singleton after disable', async () => {
      const cmd = createExperimentalCommand();

      await cmd.parseAsync(['disable', 'skills'], { from: 'user' });

      expect(resetSettings).toHaveBeenCalled();
      expect(initializeSettings).toHaveBeenCalled();
    });

    it('should show success message after disabling', async () => {
      const cmd = createExperimentalCommand();

      await cmd.parseAsync(['disable', 'skills'], { from: 'user' });

      expect(mockMessages.success).toHaveBeenCalledWith(expect.stringContaining('skills'));
    });

    it('should produce error for invalid flag name', async () => {
      const cmd = createExperimentalCommand();

      await cmd.parseAsync(['disable', 'foo'], { from: 'user' });

      expect(mockMessages.error).toHaveBeenCalledWith(expect.stringContaining('foo'));
      expect(mockMessages.error).toHaveBeenCalledWith(expect.stringContaining('list'));
      expect(mockUpdateUseCase.execute).not.toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should handle use case errors gracefully', async () => {
      mockUpdateUseCase.execute.mockRejectedValue(new Error('DB write failed'));

      const cmd = createExperimentalCommand();
      await cmd.parseAsync(['enable', 'skills'], { from: 'user' });

      expect(process.exitCode).toBe(1);
      expect(mockMessages.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed'),
        expect.any(Error)
      );

      process.exitCode = undefined;
    });
  });
});
