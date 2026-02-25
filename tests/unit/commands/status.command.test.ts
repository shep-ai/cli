/**
 * status command unit tests
 *
 * Tests for the `shep status` CLI command.
 * Covers: not-running path, running path with metrics parsing, ps timeout fallback.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Command } from 'commander';

// Hoist mocks so factory closures can reference them
const { mockExecFile, mockDaemonService, mockRenderDetailView } = vi.hoisted(() => {
  const mockExecFile = vi.fn();
  const mockDaemonService = {
    read: vi.fn(),
    write: vi.fn(),
    delete: vi.fn().mockResolvedValue(undefined),
    isAlive: vi.fn(),
  };
  const mockRenderDetailView = vi.fn();
  return { mockExecFile, mockDaemonService, mockRenderDetailView };
});

vi.mock('@/infrastructure/di/container.js', () => ({
  container: {
    resolve: vi.fn().mockImplementation((token: string) => {
      if (token === 'IDaemonService') return mockDaemonService;
      throw new Error(`Unknown token: ${token}`);
    }),
  },
}));

vi.mock('../../../src/presentation/cli/ui/index.js', () => ({
  renderDetailView: mockRenderDetailView,
  messages: {
    info: vi.fn(),
    success: vi.fn(),
    warning: vi.fn(),
    error: vi.fn(),
    newline: vi.fn(),
  },
  colors: { muted: (s: string) => s, success: (s: string) => s },
  fmt: { code: (s: string) => s, heading: (s: string) => s },
}));

vi.mock('node:child_process', () => ({
  execFile: mockExecFile,
}));

import { createStatusCommand } from '../../../src/presentation/cli/commands/status.command.js';

describe('status command', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    // Default: ps returns "12345  1.5  102400\n" (pid, cpu%, rss in KB)
    mockExecFile.mockImplementation(
      (
        _cmd: string,
        _args: string[],
        _opts: unknown,
        callback: (err: Error | null, stdout: string) => void
      ) => {
        callback(null, '12345  1.5  102400\n');
        return { kill: vi.fn() };
      }
    );
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('command structure', () => {
    it('returns a Commander Command instance', () => {
      const cmd = createStatusCommand();
      expect(cmd).toBeInstanceOf(Command);
    });

    it('has name "status"', () => {
      const cmd = createStatusCommand();
      expect(cmd.name()).toBe('status');
    });
  });

  describe('daemon not running', () => {
    it('does not call renderDetailView when read() returns null', async () => {
      mockDaemonService.read.mockResolvedValue(null);

      const cmd = createStatusCommand();
      await cmd.parseAsync([], { from: 'user' });

      expect(mockRenderDetailView).not.toHaveBeenCalled();
    });

    it('does not call execFile (ps) when no daemon running', async () => {
      mockDaemonService.read.mockResolvedValue(null);

      const cmd = createStatusCommand();
      await cmd.parseAsync([], { from: 'user' });

      expect(mockExecFile).not.toHaveBeenCalled();
    });

    it('does not call renderDetailView when PID is not alive', async () => {
      mockDaemonService.read.mockResolvedValue({
        pid: 99999,
        port: 4050,
        startedAt: new Date().toISOString(),
      });
      mockDaemonService.isAlive.mockReturnValue(false);

      const cmd = createStatusCommand();
      await cmd.parseAsync([], { from: 'user' });

      expect(mockRenderDetailView).not.toHaveBeenCalled();
    });
  });

  describe('daemon running — ps metrics', () => {
    const startedAt = '2026-02-25T00:00:00.000Z';

    beforeEach(() => {
      mockDaemonService.read.mockResolvedValue({ pid: 12345, port: 4050, startedAt });
      mockDaemonService.isAlive.mockReturnValue(true);
    });

    it('calls ps with the PID as a separate array argument (injection-safe)', async () => {
      const cmd = createStatusCommand();
      const parsePromise = cmd.parseAsync([], { from: 'user' });
      await vi.runAllTimersAsync();
      await parsePromise;

      expect(mockExecFile).toHaveBeenCalledWith(
        'ps',
        expect.arrayContaining(['12345']),
        expect.any(Object),
        expect.any(Function)
      );

      // PID must be passed as a separate element, not interpolated into a string with flags
      const [, args] = mockExecFile.mock.calls[0];
      const pidArg = args[args.length - 1];
      expect(pidArg).toBe('12345');
    });

    it('parses CPU% from ps output index 1', async () => {
      mockExecFile.mockImplementation(
        (
          _cmd: string,
          _args: string[],
          _opts: unknown,
          callback: (err: Error | null, stdout: string) => void
        ) => {
          callback(null, '12345  2.3  51200\n');
          return { kill: vi.fn() };
        }
      );

      const cmd = createStatusCommand();
      const parsePromise = cmd.parseAsync([], { from: 'user' });
      await vi.runAllTimersAsync();
      await parsePromise;

      const callArgs = mockRenderDetailView.mock.calls[0][0];
      const fields: { label: string; value: string }[] = callArgs.sections.flatMap(
        (s: { fields: { label: string; value: string }[] }) => s.fields
      );
      const cpuField = fields.find((f) => f.label.toLowerCase().includes('cpu'));
      expect(cpuField?.value).toContain('2.3');
    });

    it('converts RSS from KB to MB (102400 KB = 100 MB)', async () => {
      mockExecFile.mockImplementation(
        (
          _cmd: string,
          _args: string[],
          _opts: unknown,
          callback: (err: Error | null, stdout: string) => void
        ) => {
          callback(null, '12345  1.5  102400\n');
          return { kill: vi.fn() };
        }
      );

      const cmd = createStatusCommand();
      const parsePromise = cmd.parseAsync([], { from: 'user' });
      await vi.runAllTimersAsync();
      await parsePromise;

      const callArgs = mockRenderDetailView.mock.calls[0][0];
      const fields: { label: string; value: string }[] = callArgs.sections.flatMap(
        (s: { fields: { label: string; value: string }[] }) => s.fields
      );
      const memField = fields.find(
        (f) => f.label.toLowerCase().includes('mem') || f.label.toLowerCase().includes('rss')
      );
      expect(memField?.value).toContain('100');
    });

    it('calls renderDetailView with pid, port, url, uptime, cpu, and rss fields', async () => {
      const cmd = createStatusCommand();
      const parsePromise = cmd.parseAsync([], { from: 'user' });
      await vi.runAllTimersAsync();
      await parsePromise;

      expect(mockRenderDetailView).toHaveBeenCalledTimes(1);
      const callArgs = mockRenderDetailView.mock.calls[0][0];
      const fields: { label: string; value: string }[] = callArgs.sections.flatMap(
        (s: { fields: { label: string; value: string }[] }) => s.fields
      );
      const labels = fields.map((f) => f.label.toLowerCase());

      expect(labels.some((l) => l.includes('pid'))).toBe(true);
      expect(labels.some((l) => l.includes('port'))).toBe(true);
      expect(labels.some((l) => l.includes('url'))).toBe(true);
      expect(labels.some((l) => l.includes('uptime') || l.includes('started'))).toBe(true);
      expect(labels.some((l) => l.includes('cpu'))).toBe(true);
      expect(labels.some((l) => l.includes('mem') || l.includes('rss'))).toBe(true);
    });
  });

  describe('ps timeout fallback', () => {
    beforeEach(() => {
      mockDaemonService.read.mockResolvedValue({
        pid: 12345,
        port: 4050,
        startedAt: new Date().toISOString(),
      });
      mockDaemonService.isAlive.mockReturnValue(true);
    });

    it('shows metrics unavailable gracefully when ps times out', async () => {
      // Simulate ps timeout — never calls callback
      mockExecFile.mockImplementation(
        (_cmd: string, _args: string[], _opts: unknown, _callback: unknown) => {
          return { kill: vi.fn() };
        }
      );

      const cmd = createStatusCommand();
      const parsePromise = cmd.parseAsync([], { from: 'user' });

      // Advance past the 2s ps timeout
      await vi.advanceTimersByTimeAsync(3000);
      await parsePromise;

      // Should still call renderDetailView but with metrics unavailable
      expect(mockRenderDetailView).toHaveBeenCalledTimes(1);
      const callArgs = mockRenderDetailView.mock.calls[0][0];
      const fields: { label: string; value: string }[] = callArgs.sections.flatMap(
        (s: { fields: { label: string; value: string }[] }) => s.fields
      );
      const cpuField = fields.find((f) => f.label.toLowerCase().includes('cpu'));
      expect(cpuField?.value).toContain('unavailable');
    });
  });
});
