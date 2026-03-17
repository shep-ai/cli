/**
 * adopt command unit tests
 *
 * Tests for the `shep feat adopt <branch>` CLI command.
 * Covers: command structure, successful adoption output, error handling.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Command } from 'commander';
import type { Feature } from '@/domain/generated/output.js';

// Hoist mocks so factory closures can reference them
const { mockUseCase, mockMessages, mockColors, mockSpinner } = vi.hoisted(() => {
  const mockUseCase = {
    execute: vi.fn(),
  };
  const mockMessages = {
    success: vi.fn(),
    error: vi.fn(),
    newline: vi.fn(),
  };
  const mockColors = {
    muted: (s: string) => s,
    accent: (s: string) => s,
    success: (s: string) => s,
  };
  const mockSpinner = vi.fn((_label: string, fn: () => Promise<unknown>) => fn());
  return { mockUseCase, mockMessages, mockColors, mockSpinner };
});

vi.mock('@/infrastructure/di/container.js', () => ({
  container: {
    resolve: vi.fn().mockReturnValue(mockUseCase),
  },
}));

// Mock the use case module to prevent tsyringe from loading
vi.mock('@/application/use-cases/features/adopt-branch.use-case.js', () => ({
  AdoptBranchUseCase: vi.fn(),
}));

vi.mock('../../../../src/presentation/cli/ui/index.js', () => ({
  messages: mockMessages,
  colors: mockColors,
  spinner: mockSpinner,
}));

import { createAdoptCommand } from '../../../../src/presentation/cli/commands/feat/adopt.command.js';

describe('adopt command', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.exitCode = undefined;
  });

  describe('command structure', () => {
    it('returns a Commander Command instance', () => {
      const cmd = createAdoptCommand();
      expect(cmd).toBeInstanceOf(Command);
    });

    it('has name "adopt"', () => {
      const cmd = createAdoptCommand();
      expect(cmd.name()).toBe('adopt');
    });

    it('requires a branch argument', () => {
      const cmd = createAdoptCommand();
      // Commander registers arguments on the _args array
      expect(cmd.registeredArguments).toHaveLength(1);
      expect(cmd.registeredArguments[0].name()).toBe('branch');
      expect(cmd.registeredArguments[0].required).toBe(true);
    });

    it('has a -r/--repo option', () => {
      const cmd = createAdoptCommand();
      const repoOption = cmd.options.find((o) => o.long === '--repo');
      expect(repoOption).toBeDefined();
      expect(repoOption?.short).toBe('-r');
    });
  });

  describe('successful adoption', () => {
    const mockFeature: Partial<Feature> = {
      id: 'abc12345-6789-0000-0000-000000000000',
      name: 'Login Bug',
      branch: 'fix/login-bug',
      lifecycle: 'Maintain' as Feature['lifecycle'],
      worktreePath: '/home/user/.shep/repos/abc/wt/fix-login-bug',
    };

    beforeEach(() => {
      mockUseCase.execute.mockResolvedValue({ feature: mockFeature });
    });

    it('calls use case with branch name and cwd as default repo', async () => {
      const cmd = createAdoptCommand();
      await cmd.parseAsync(['fix/login-bug'], { from: 'user' });

      expect(mockUseCase.execute).toHaveBeenCalledWith({
        branchName: 'fix/login-bug',
        repositoryPath: process.cwd(),
      });
    });

    it('calls use case with branch name and custom repo path', async () => {
      const cmd = createAdoptCommand();
      await cmd.parseAsync(['fix/login-bug', '-r', '/custom/repo'], { from: 'user' });

      expect(mockUseCase.execute).toHaveBeenCalledWith({
        branchName: 'fix/login-bug',
        repositoryPath: '/custom/repo',
      });
    });

    it('displays success message with feature metadata', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);

      const cmd = createAdoptCommand();
      await cmd.parseAsync(['fix/login-bug'], { from: 'user' });

      expect(mockMessages.success).toHaveBeenCalledWith('Branch adopted');
      // Verify key metadata is output
      const allOutput = consoleSpy.mock.calls.map((c) => c[0]).join('\n');
      expect(allOutput).toContain('abc12345');
      expect(allOutput).toContain('Login Bug');
      expect(allOutput).toContain('fix/login-bug');
      expect(allOutput).toContain('Maintain');
      expect(allOutput).toContain('/home/user/.shep/repos/abc/wt/fix-login-bug');

      consoleSpy.mockRestore();
    });

    it('uses spinner during execution', async () => {
      const cmd = createAdoptCommand();
      await cmd.parseAsync(['fix/login-bug'], { from: 'user' });

      expect(mockSpinner).toHaveBeenCalledWith('Adopting branch', expect.any(Function));
    });

    it('does not set process.exitCode on success', async () => {
      const cmd = createAdoptCommand();
      await cmd.parseAsync(['fix/login-bug'], { from: 'user' });

      expect(process.exitCode).toBeUndefined();
    });
  });

  describe('error handling', () => {
    it('displays error message and sets exitCode on failure', async () => {
      mockUseCase.execute.mockRejectedValue(new Error('Branch "main" cannot be adopted'));

      const cmd = createAdoptCommand();
      await cmd.parseAsync(['main'], { from: 'user' });

      expect(mockMessages.error).toHaveBeenCalledWith('Failed to adopt branch', expect.any(Error));
      expect(process.exitCode).toBe(1);
    });

    it('wraps non-Error exceptions in an Error', async () => {
      mockUseCase.execute.mockRejectedValue('string error');

      const cmd = createAdoptCommand();
      await cmd.parseAsync(['some-branch'], { from: 'user' });

      expect(mockMessages.error).toHaveBeenCalledWith(
        'Failed to adopt branch',
        expect.objectContaining({ message: 'string error' })
      );
      expect(process.exitCode).toBe(1);
    });

    it('does not display success message on failure', async () => {
      mockUseCase.execute.mockRejectedValue(new Error('branch not found'));

      const cmd = createAdoptCommand();
      await cmd.parseAsync(['nonexistent'], { from: 'user' });

      expect(mockMessages.success).not.toHaveBeenCalled();
    });
  });
});
