/**
 * Rebase command unit tests
 *
 * Tests for the `shep feat rebase` CLI command.
 * Covers command structure (name, options, arguments) and action handler
 * delegation to BatchRebaseFeaturesUseCase.
 */

import 'reflect-metadata';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Command } from 'commander';

const { mockBatchRebaseUseCase, mockMessages, mockRenderListView, mockColors } = vi.hoisted(() => {
  const mockBatchRebaseUseCase = {
    execute: vi.fn().mockResolvedValue([]),
  };
  const mockMessages = {
    info: vi.fn(),
    success: vi.fn(),
    warning: vi.fn(),
    error: vi.fn(),
    newline: vi.fn(),
    log: vi.fn(),
  };
  const mockRenderListView = vi.fn();
  const mockColors = {
    success: (s: string) => s,
    error: (s: string) => s,
    warning: (s: string) => s,
    muted: (s: string) => s,
    info: (s: string) => s,
    brand: (s: string) => s,
    accent: (s: string) => s,
  };
  return { mockBatchRebaseUseCase, mockMessages, mockRenderListView, mockColors };
});

vi.mock('@/infrastructure/di/container.js', () => ({
  container: {
    resolve: vi.fn().mockReturnValue(mockBatchRebaseUseCase),
  },
}));

vi.mock('../../../../src/presentation/cli/ui/index.js', () => ({
  messages: mockMessages,
  colors: mockColors,
  renderListView: mockRenderListView,
}));

import { createRebaseCommand } from '../../../../src/presentation/cli/commands/feat/rebase.command.js';

describe('rebase command', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockBatchRebaseUseCase.execute.mockResolvedValue([]);
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

    it('has a --strategy option with default "merge"', () => {
      const cmd = createRebaseCommand();
      const opt = cmd.options.find((o: { long?: string }) => o.long === '--strategy');
      expect(opt).toBeDefined();
      expect(opt?.short).toBe('-s');
      expect(opt?.defaultValue).toBe('merge');
    });

    it('has a --lifecycle option', () => {
      const cmd = createRebaseCommand();
      const opt = cmd.options.find((o: { long?: string }) => o.long === '--lifecycle');
      expect(opt).toBeDefined();
      expect(opt?.short).toBe('-l');
    });

    it('has a variadic featureIds argument', () => {
      const cmd = createRebaseCommand();
      // Commander stores registered arguments
      const arg = cmd.registeredArguments.find(
        (a: { name: () => string }) => a.name() === 'featureIds'
      );
      expect(arg).toBeDefined();
      expect(arg?.variadic).toBe(true);
    });
  });

  describe('command execution', () => {
    it('calls use case execute with default options', async () => {
      const cmd = createRebaseCommand();
      await cmd.parseAsync([], { from: 'user' });

      expect(mockBatchRebaseUseCase.execute).toHaveBeenCalledTimes(1);
      const callArgs = mockBatchRebaseUseCase.execute.mock.calls[0][0];
      expect(callArgs.strategy).toBe('merge');
      expect(callArgs.repositoryPath).toBe(process.cwd());
      expect(callArgs.lifecycle).toBeUndefined();
      expect(callArgs.featureIds).toBeUndefined();
    });

    it('passes --strategy rebase to use case', async () => {
      const cmd = createRebaseCommand();
      await cmd.parseAsync(['--strategy', 'rebase'], { from: 'user' });

      const callArgs = mockBatchRebaseUseCase.execute.mock.calls[0][0];
      expect(callArgs.strategy).toBe('rebase');
    });

    it('passes --lifecycle filter to use case', async () => {
      const cmd = createRebaseCommand();
      await cmd.parseAsync(['--lifecycle', 'Implementation'], { from: 'user' });

      const callArgs = mockBatchRebaseUseCase.execute.mock.calls[0][0];
      expect(callArgs.lifecycle).toBe('Implementation');
    });

    it('passes feature IDs to use case', async () => {
      const cmd = createRebaseCommand();
      await cmd.parseAsync(['abc123', 'def456'], { from: 'user' });

      const callArgs = mockBatchRebaseUseCase.execute.mock.calls[0][0];
      expect(callArgs.featureIds).toEqual(['abc123', 'def456']);
    });

    it('passes an onProgress callback', async () => {
      const cmd = createRebaseCommand();
      await cmd.parseAsync([], { from: 'user' });

      const callArgs = mockBatchRebaseUseCase.execute.mock.calls[0][0];
      expect(typeof callArgs.onProgress).toBe('function');
    });

    it('onProgress callback calls messages.info', async () => {
      const cmd = createRebaseCommand();
      await cmd.parseAsync([], { from: 'user' });

      const callArgs = mockBatchRebaseUseCase.execute.mock.calls[0][0];
      callArgs.onProgress({ index: 2, total: 5, name: 'my-feature' });
      expect(mockMessages.info).toHaveBeenCalledWith(expect.stringContaining('3/5'));
    });
  });

  describe('result rendering', () => {
    it('renders results table via renderListView', async () => {
      mockBatchRebaseUseCase.execute.mockResolvedValue([
        { featureId: 'f1', featureName: 'Feature One', branch: 'feat/one', status: 'success' },
      ]);

      const cmd = createRebaseCommand();
      await cmd.parseAsync([], { from: 'user' });

      expect(mockRenderListView).toHaveBeenCalledTimes(1);
      const config = mockRenderListView.mock.calls[0][0];
      expect(config.title).toBe('Rebase Results');
      expect(config.columns).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ label: 'Feature' }),
          expect.objectContaining({ label: 'Branch' }),
          expect.objectContaining({ label: 'Status' }),
          expect.objectContaining({ label: 'Reason' }),
        ])
      );
      expect(config.rows).toHaveLength(1);
    });

    it('displays aggregate summary with counts', async () => {
      mockBatchRebaseUseCase.execute.mockResolvedValue([
        { featureId: 'f1', featureName: 'A', branch: 'a', status: 'success' },
        { featureId: 'f2', featureName: 'B', branch: 'b', status: 'skipped', reason: 'dirty' },
        { featureId: 'f3', featureName: 'C', branch: 'c', status: 'failed', reason: 'conflicts' },
      ]);

      const cmd = createRebaseCommand();
      await cmd.parseAsync([], { from: 'user' });

      // Summary should mention counts
      const logCalls = mockMessages.log.mock.calls.map((c: unknown[]) => c[0] as string);
      const summaryLine = logCalls.find(
        (line) =>
          line.includes('1 succeeded') && line.includes('1 skipped') && line.includes('1 failed')
      );
      expect(summaryLine).toBeDefined();
    });

    it('sets exit code 1 when any feature failed', async () => {
      mockBatchRebaseUseCase.execute.mockResolvedValue([
        { featureId: 'f1', featureName: 'A', branch: 'a', status: 'success' },
        { featureId: 'f2', featureName: 'B', branch: 'b', status: 'failed', reason: 'conflicts' },
      ]);

      const cmd = createRebaseCommand();
      await cmd.parseAsync([], { from: 'user' });

      expect(process.exitCode).toBe(1);
    });

    it('does not set exit code 1 when all succeeded or skipped', async () => {
      mockBatchRebaseUseCase.execute.mockResolvedValue([
        { featureId: 'f1', featureName: 'A', branch: 'a', status: 'success' },
        { featureId: 'f2', featureName: 'B', branch: 'b', status: 'skipped', reason: 'dirty' },
      ]);

      const cmd = createRebaseCommand();
      await cmd.parseAsync([], { from: 'user' });

      expect(process.exitCode).toBeUndefined();
    });

    it('catches errors and displays via messages.error', async () => {
      mockBatchRebaseUseCase.execute.mockRejectedValue(new Error('No remote configured'));

      const cmd = createRebaseCommand();
      await cmd.parseAsync([], { from: 'user' });

      expect(mockMessages.error).toHaveBeenCalledWith(
        'Failed to rebase features',
        expect.any(Error)
      );
      expect(process.exitCode).toBe(1);
    });
  });
});
