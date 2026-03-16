/**
 * sync command unit tests
 *
 * Tests for the `shep repo sync` CLI command.
 * Covers: non-fork no-op, successful fork sync, error path.
 */

import 'reflect-metadata';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Command } from 'commander';

const mockSyncForkMainUseCase = {
  execute: vi.fn(),
};

vi.mock('@/infrastructure/di/container.js', () => ({
  container: {
    resolve: vi.fn().mockImplementation(() => mockSyncForkMainUseCase),
  },
}));

vi.mock('../../../src/presentation/cli/ui/index.js', () => ({
  messages: {
    info: vi.fn(),
    success: vi.fn(),
    warning: vi.fn(),
    error: vi.fn(),
    newline: vi.fn(),
  },
  colors: {
    muted: (s: string) => s,
    success: (s: string) => s,
    accent: (s: string) => s,
    error: (s: string) => s,
    warning: (s: string) => s,
  },
}));

import { createSyncCommand } from '../../../../src/presentation/cli/commands/repo/sync.command.js';

describe('sync command', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.exitCode = undefined;
  });

  describe('command structure', () => {
    it('returns a Commander Command instance', () => {
      const cmd = createSyncCommand();
      expect(cmd).toBeInstanceOf(Command);
    });

    it('has name "sync"', () => {
      const cmd = createSyncCommand();
      expect(cmd.name()).toBe('sync');
    });

    it('accepts no positional arguments', () => {
      const cmd = createSyncCommand();
      expect(cmd.registeredArguments).toHaveLength(0);
    });
  });

  describe('non-fork repository', () => {
    it('calls use case with process.cwd()', async () => {
      mockSyncForkMainUseCase.execute.mockResolvedValue({
        synced: false,
        reason: 'not-a-fork',
      });

      const cmd = createSyncCommand();
      await cmd.parseAsync([], { from: 'user' });

      expect(mockSyncForkMainUseCase.execute).toHaveBeenCalledWith(process.cwd());
    });

    it('does not set process.exitCode for non-fork result', async () => {
      mockSyncForkMainUseCase.execute.mockResolvedValue({
        synced: false,
        reason: 'not-a-fork',
      });

      const cmd = createSyncCommand();
      await cmd.parseAsync([], { from: 'user' });

      expect(process.exitCode).toBeFalsy();
    });
  });

  describe('fork sync success', () => {
    it('does not set process.exitCode on success', async () => {
      mockSyncForkMainUseCase.execute.mockResolvedValue({
        synced: true,
        upstreamUrl: 'https://github.com/org/repo.git',
      });

      const cmd = createSyncCommand();
      await cmd.parseAsync([], { from: 'user' });

      expect(process.exitCode).toBeFalsy();
    });
  });

  describe('error handling', () => {
    it('sets process.exitCode to 1 on error', async () => {
      mockSyncForkMainUseCase.execute.mockRejectedValue(new Error('gh not found'));

      const cmd = createSyncCommand();
      await cmd.parseAsync([], { from: 'user' });

      expect(process.exitCode).toBe(1);
    });
  });
});
