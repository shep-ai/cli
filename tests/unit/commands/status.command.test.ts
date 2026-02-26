/**
 * status command unit tests
 *
 * Tests for the `shep status` CLI command.
 * Covers: not-running path, running path with metrics parsing, ps timeout fallback,
 * environment section, agent executor versions, --logs flag.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Command } from 'commander';

// Hoist mocks so factory closures can reference them
const { mockExecFile, mockDaemonService, mockRenderDetailView, mockVersionService, mockFactory } =
  vi.hoisted(() => {
    const mockExecFile = vi.fn();
    const mockDaemonService = {
      read: vi.fn(),
      write: vi.fn(),
      delete: vi.fn().mockResolvedValue(undefined),
      isAlive: vi.fn(),
    };
    const mockRenderDetailView = vi.fn();
    const mockVersionService = {
      getVersion: vi.fn().mockReturnValue({
        version: '1.56.0',
        name: '@shepai/cli',
        description: 'Shep AI CLI',
      }),
    };
    const mockFactory = {
      getCliInfo: vi.fn().mockReturnValue([
        { agentType: 'claude-code', cmd: 'claude', versionArgs: ['--version'] },
        { agentType: 'gemini-cli', cmd: 'gemini', versionArgs: ['--version'] },
        { agentType: 'cursor', cmd: 'cursor', versionArgs: ['--version'] },
      ]),
      getSupportedAgents: vi.fn(),
      createExecutor: vi.fn(),
    };
    return {
      mockExecFile,
      mockDaemonService,
      mockRenderDetailView,
      mockVersionService,
      mockFactory,
    };
  });

vi.mock('@/infrastructure/di/container.js', () => ({
  container: {
    resolve: vi.fn().mockImplementation((token: string) => {
      if (token === 'IDaemonService') return mockDaemonService;
      if (token === 'IVersionService') return mockVersionService;
      if (token === 'IAgentExecutorFactory') return mockFactory;
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

vi.mock('@/infrastructure/services/filesystem/shep-directory.service.js', () => ({
  getShepHomeDir: vi.fn().mockReturnValue('/home/test/.shep'),
  getShepDbPath: vi.fn().mockReturnValue('/home/test/.shep/data'),
  getDaemonStatePath: vi.fn().mockReturnValue('/home/test/.shep/daemon.json'),
  getDaemonLogPath: vi.fn().mockReturnValue('/home/test/.shep/daemon.log'),
}));

vi.mock('node:fs', async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return {
    ...actual,
    existsSync: vi.fn().mockReturnValue(false),
    statSync: vi.fn().mockReturnValue({ size: 0 }),
  };
});

import { createStatusCommand } from '../../../src/presentation/cli/commands/status.command.js';

describe('status command', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    // Default: execFile returns ps output or agent version "not installed" error
    mockExecFile.mockImplementation(
      (
        cmd: string,
        _args: string[],
        _opts: unknown,
        callback: (err: Error | null, stdout: string) => void
      ) => {
        if (cmd === 'ps') {
          callback(null, '12345  1.5  102400\n');
        } else {
          // Agent version commands — default to "not installed"
          callback(new Error('not found'), '');
        }
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

      // Find the ps call specifically
      const psCall = mockExecFile.mock.calls.find((call: unknown[]) => call[0] === 'ps');
      expect(psCall).toBeDefined();
      expect(psCall![1]).toEqual(expect.arrayContaining(['12345']));

      // PID must be passed as a separate element
      const pidArg = psCall![1][psCall![1].length - 1];
      expect(pidArg).toBe('12345');
    });

    it('parses CPU% from ps output index 1', async () => {
      mockExecFile.mockImplementation(
        (
          cmd: string,
          _args: string[],
          _opts: unknown,
          callback: (err: Error | null, stdout: string) => void
        ) => {
          if (cmd === 'ps') {
            callback(null, '12345  2.3  51200\n');
          } else {
            callback(new Error('not found'), '');
          }
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

  describe('environment section', () => {
    const startedAt = '2026-02-25T00:00:00.000Z';

    beforeEach(() => {
      mockDaemonService.read.mockResolvedValue({ pid: 12345, port: 4050, startedAt });
      mockDaemonService.isAlive.mockReturnValue(true);
    });

    it('includes environment fields: shep home, cli version, node version, paths', async () => {
      const cmd = createStatusCommand();
      const parsePromise = cmd.parseAsync([], { from: 'user' });
      await vi.runAllTimersAsync();
      await parsePromise;

      const callArgs = mockRenderDetailView.mock.calls[0][0];
      const fields: { label: string; value: string }[] = callArgs.sections.flatMap(
        (s: { fields: { label: string; value: string }[] }) => s.fields
      );
      const labels = fields.map((f) => f.label.toLowerCase());

      expect(labels.some((l) => l.includes('shep home'))).toBe(true);
      expect(labels.some((l) => l.includes('cli version'))).toBe(true);
      expect(labels.some((l) => l.includes('node version'))).toBe(true);
      expect(labels.some((l) => l.includes('log file'))).toBe(true);
      expect(labels.some((l) => l.includes('db path'))).toBe(true);
    });

    it('displays the CLI version from VersionService', async () => {
      const cmd = createStatusCommand();
      const parsePromise = cmd.parseAsync([], { from: 'user' });
      await vi.runAllTimersAsync();
      await parsePromise;

      const callArgs = mockRenderDetailView.mock.calls[0][0];
      const fields: { label: string; value: string }[] = callArgs.sections.flatMap(
        (s: { fields: { label: string; value: string }[] }) => s.fields
      );
      const versionField = fields.find((f) => f.label.toLowerCase().includes('cli version'));
      expect(versionField?.value).toBe('1.56.0');
    });
  });

  describe('agent executor versions', () => {
    const startedAt = '2026-02-25T00:00:00.000Z';

    beforeEach(() => {
      mockDaemonService.read.mockResolvedValue({ pid: 12345, port: 4050, startedAt });
      mockDaemonService.isAlive.mockReturnValue(true);
    });

    it('includes agent executor section with claude-code, gemini-cli, cursor', async () => {
      const cmd = createStatusCommand();
      const parsePromise = cmd.parseAsync([], { from: 'user' });
      await vi.runAllTimersAsync();
      await parsePromise;

      const callArgs = mockRenderDetailView.mock.calls[0][0];
      const fields: { label: string; value: string }[] = callArgs.sections.flatMap(
        (s: { fields: { label: string; value: string }[] }) => s.fields
      );
      const labels = fields.map((f) => f.label.toLowerCase());

      expect(labels.some((l) => l.includes('claude-code'))).toBe(true);
      expect(labels.some((l) => l.includes('gemini-cli'))).toBe(true);
      expect(labels.some((l) => l.includes('cursor'))).toBe(true);
    });

    it('shows "not installed" when agent CLI is not found', async () => {
      const cmd = createStatusCommand();
      const parsePromise = cmd.parseAsync([], { from: 'user' });
      await vi.runAllTimersAsync();
      await parsePromise;

      const callArgs = mockRenderDetailView.mock.calls[0][0];
      const fields: { label: string; value: string }[] = callArgs.sections.flatMap(
        (s: { fields: { label: string; value: string }[] }) => s.fields
      );
      const claudeField = fields.find((f) => f.label === 'claude-code');
      expect(claudeField?.value).toBe('not installed');
    });

    it('shows version when agent CLI is available', async () => {
      mockExecFile.mockImplementation(
        (
          cmd: string,
          _args: string[],
          _opts: unknown,
          callback: (err: Error | null, stdout: string) => void
        ) => {
          if (cmd === 'ps') {
            callback(null, '12345  1.5  102400\n');
          } else if (cmd === 'claude') {
            callback(null, '1.0.33\n');
          } else {
            callback(new Error('not found'), '');
          }
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
      const claudeField = fields.find((f) => f.label === 'claude-code');
      expect(claudeField?.value).toBe('1.0.33');
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
      // Simulate ps timeout — never calls callback for ps, but resolve agent versions
      mockExecFile.mockImplementation(
        (
          cmd: string,
          _args: string[],
          _opts: unknown,
          callback: (err: Error | null, stdout: string) => void
        ) => {
          if (cmd !== 'ps') {
            callback(new Error('not found'), '');
          }
          // ps never calls back — simulates timeout
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
