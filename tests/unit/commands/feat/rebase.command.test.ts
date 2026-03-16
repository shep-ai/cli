/**
 * rebase command unit tests
 *
 * Tests for the `shep feat rebase <feature-id>` CLI command.
 * Covers: success path, REBASE_CONFLICT error, generic errors.
 */

import 'reflect-metadata';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Command } from 'commander';
import {
  GitPrError,
  GitPrErrorCode,
} from '../../../../packages/core/src/application/ports/output/services/git-pr-service.interface.js';

const mockRebaseFeatureUseCase = {
  execute: vi.fn(),
};

vi.mock('@/infrastructure/di/container.js', () => ({
  container: {
    resolve: vi.fn().mockImplementation((token: unknown) => {
      if (typeof token === 'function' && token.name === 'RebaseFeatureUseCase') {
        return mockRebaseFeatureUseCase;
      }
      // Also handle direct class reference
      return mockRebaseFeatureUseCase;
    }),
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

import { createRebaseCommand } from '../../../../src/presentation/cli/commands/feat/rebase.command.js';

describe('rebase command', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.exitCode = undefined;
  });

  describe('command structure', () => {
    it('returns a Commander Command instance', () => {
      const cmd = createRebaseCommand();
      expect(cmd).toBeInstanceOf(Command);
    });

    it('has name "rebase"', () => {
      const cmd = createRebaseCommand();
      expect(cmd.name()).toBe('rebase');
    });

    it('requires a feature-id argument', () => {
      const cmd = createRebaseCommand();
      const args = cmd.registeredArguments;
      expect(args.length).toBeGreaterThan(0);
      expect(args[0].required).toBe(true);
    });
  });

  describe('success path', () => {
    it('calls use case with the given feature id', async () => {
      mockRebaseFeatureUseCase.execute.mockResolvedValue({
        success: true,
        branch: 'feat/my-feature',
        rebased: true,
      });

      const cmd = createRebaseCommand();
      await cmd.parseAsync(['feat-123'], { from: 'user' });

      expect(mockRebaseFeatureUseCase.execute).toHaveBeenCalledWith('feat-123');
    });

    it('does not set process.exitCode on success', async () => {
      mockRebaseFeatureUseCase.execute.mockResolvedValue({
        success: true,
        branch: 'feat/my-feature',
        rebased: true,
      });

      const cmd = createRebaseCommand();
      await cmd.parseAsync(['feat-123'], { from: 'user' });

      expect(process.exitCode).toBeFalsy();
    });
  });

  describe('REBASE_CONFLICT error', () => {
    it('sets process.exitCode to 1 on REBASE_CONFLICT', async () => {
      const conflictError = new GitPrError(
        "Rebase of 'feat/foo' onto 'main' failed due to conflicts.\nConflicting files:\n  - src/foo.ts\n\nResolve the conflicts manually then re-run the rebase command.",
        GitPrErrorCode.REBASE_CONFLICT
      );
      mockRebaseFeatureUseCase.execute.mockRejectedValue(conflictError);

      const cmd = createRebaseCommand();
      await cmd.parseAsync(['feat-123'], { from: 'user' });

      expect(process.exitCode).toBe(1);
    });
  });

  describe('generic error', () => {
    it('sets process.exitCode to 1 on generic error', async () => {
      mockRebaseFeatureUseCase.execute.mockRejectedValue(new Error('Feature not found'));

      const cmd = createRebaseCommand();
      await cmd.parseAsync(['feat-123'], { from: 'user' });

      expect(process.exitCode).toBe(1);
    });
  });
});
