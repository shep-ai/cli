// @vitest-environment node

/**
 * Upgrade Command Unit Tests
 *
 * Tests for the `shep upgrade` command.
 *
 * TDD Phase: RED → GREEN → REFACTOR
 */

import 'reflect-metadata';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Command } from 'commander';
import { EventEmitter } from 'node:events';
import type { ChildProcess } from 'node:child_process';

// --- Mocks ---

vi.mock('@/infrastructure/di/container.js', () => ({
  container: {
    resolve: vi.fn(),
  },
}));

vi.mock('@cli/presentation/cli/ui/index.js', () => ({
  messages: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
  },
  colors: {
    accent: (s: string) => s,
    muted: (s: string) => s,
  },
  fmt: {
    heading: (s: string) => s,
    label: (s: string) => s,
    code: (s: string) => s,
    version: (s: string) => `v${s}`,
  },
  symbols: {},
}));

// Import after mocks
import { createUpgradeCommand } from '@cli/presentation/cli/commands/upgrade.command.js';
import { container } from '@/infrastructure/di/container.js';
import { messages } from '@cli/presentation/cli/ui/index.js';

/**
 * Create a mock ChildProcess that emits events on demand.
 * Returns the fake process and a control function to trigger close/error.
 */
function createMockChildProcess() {
  const proc = new EventEmitter() as ChildProcess & EventEmitter;
  // Add a minimal stdout for the version check (piped) case
  (proc as any).stdout = new EventEmitter();
  (proc as any).stderr = new EventEmitter();
  (proc as any).kill = vi.fn();
  return proc;
}

/**
 * Create a mock spawn function that records calls and returns controlled child processes.
 */
function createMockSpawn() {
  const processes: { proc: ReturnType<typeof createMockChildProcess>; args: any[] }[] = [];

  const spawnFn = vi.fn((...args: any[]) => {
    const proc = createMockChildProcess();
    processes.push({ proc, args });
    return proc;
  });

  return { spawnFn, processes };
}

describe('Upgrade Command', () => {
  const CURRENT_VERSION = '1.20.0';
  let savedExitCode: typeof process.exitCode;

  beforeEach(() => {
    vi.clearAllMocks();
    savedExitCode = process.exitCode;
    process.exitCode = 0;

    // Mock IVersionService
    vi.mocked(container.resolve).mockReturnValue({
      getVersion: () => ({
        version: CURRENT_VERSION,
        name: '@shepai/cli',
        description: 'Autonomous AI Native SDLC Platform',
      }),
    });
  });

  afterEach(() => {
    process.exitCode = savedExitCode;
  });

  describe('command structure', () => {
    it('should return a Commander Command with name "upgrade"', () => {
      const { spawnFn } = createMockSpawn();
      const cmd = createUpgradeCommand(spawnFn as any);
      expect(cmd).toBeInstanceOf(Command);
      expect(cmd.name()).toBe('upgrade');
    });

    it('should have description "Upgrade Shep CLI to the latest version"', () => {
      const { spawnFn } = createMockSpawn();
      const cmd = createUpgradeCommand(spawnFn as any);
      expect(cmd.description()).toBe('Upgrade Shep CLI to the latest version');
    });
  });

  describe('already up to date', () => {
    it('should print already-up-to-date message when latest equals current version', async () => {
      const { spawnFn, processes } = createMockSpawn();
      const cmd = createUpgradeCommand(spawnFn as any);

      const parsePromise = cmd.parseAsync(['node', 'test']);

      // Wait for spawn to be called (npm view)
      await vi.waitFor(() => expect(processes.length).toBe(1));

      // npm view returns same version as current
      const viewProc = processes[0].proc;
      (viewProc as any).stdout.emit('data', Buffer.from(`${CURRENT_VERSION}\n`));
      viewProc.emit('close', 0);

      await parsePromise;

      expect(messages.success).toHaveBeenCalledWith(expect.stringContaining('up to date'));
      expect(messages.success).toHaveBeenCalledWith(expect.stringContaining(CURRENT_VERSION));
    });

    it('should not spawn npm install when already up to date', async () => {
      const { spawnFn, processes } = createMockSpawn();
      const cmd = createUpgradeCommand(spawnFn as any);

      const parsePromise = cmd.parseAsync(['node', 'test']);

      await vi.waitFor(() => expect(processes.length).toBe(1));

      const viewProc = processes[0].proc;
      (viewProc as any).stdout.emit('data', Buffer.from(`${CURRENT_VERSION}\n`));
      viewProc.emit('close', 0);

      await parsePromise;

      // Only one spawn call (npm view), no second call (npm install)
      expect(spawnFn).toHaveBeenCalledTimes(1);
      expect(process.exitCode).toBe(0);
    });
  });

  describe('successful upgrade', () => {
    it('should print upgrade info when newer version is available', async () => {
      const { spawnFn, processes } = createMockSpawn();
      const cmd = createUpgradeCommand(spawnFn as any);

      const parsePromise = cmd.parseAsync(['node', 'test']);

      // npm view returns newer version
      await vi.waitFor(() => expect(processes.length).toBe(1));
      const viewProc = processes[0].proc;
      (viewProc as any).stdout.emit('data', Buffer.from('2.0.0\n'));
      viewProc.emit('close', 0);

      // npm install spawned
      await vi.waitFor(() => expect(processes.length).toBe(2));
      const installProc = processes[1].proc;
      installProc.emit('close', 0);

      await parsePromise;

      expect(messages.info).toHaveBeenCalledWith(expect.stringContaining(CURRENT_VERSION));
      expect(messages.info).toHaveBeenCalledWith(expect.stringContaining('2.0.0'));
    });

    it('should spawn npm install with stdio inherit when upgrade available', async () => {
      const { spawnFn, processes } = createMockSpawn();
      const cmd = createUpgradeCommand(spawnFn as any);

      const parsePromise = cmd.parseAsync(['node', 'test']);

      await vi.waitFor(() => expect(processes.length).toBe(1));
      const viewProc = processes[0].proc;
      (viewProc as any).stdout.emit('data', Buffer.from('2.0.0\n'));
      viewProc.emit('close', 0);

      await vi.waitFor(() => expect(processes.length).toBe(2));
      const installProc = processes[1].proc;
      installProc.emit('close', 0);

      await parsePromise;

      // Check the second spawn call is npm install with inherit
      expect(spawnFn).toHaveBeenCalledWith(
        'npm',
        ['i', '-g', '@shepai/cli@latest'],
        expect.objectContaining({ stdio: 'inherit' })
      );
    });

    it('should print success message on exit code 0', async () => {
      const { spawnFn, processes } = createMockSpawn();
      const cmd = createUpgradeCommand(spawnFn as any);

      const parsePromise = cmd.parseAsync(['node', 'test']);

      await vi.waitFor(() => expect(processes.length).toBe(1));
      const viewProc = processes[0].proc;
      (viewProc as any).stdout.emit('data', Buffer.from('2.0.0\n'));
      viewProc.emit('close', 0);

      await vi.waitFor(() => expect(processes.length).toBe(2));
      processes[1].proc.emit('close', 0);

      await parsePromise;

      expect(messages.success).toHaveBeenCalledWith(
        expect.stringContaining('upgraded successfully')
      );
      expect(process.exitCode).toBe(0);
    });
  });

  describe('error handling', () => {
    it('should print error and set exitCode=1 on npm install non-zero exit', async () => {
      const { spawnFn, processes } = createMockSpawn();
      const cmd = createUpgradeCommand(spawnFn as any);

      const parsePromise = cmd.parseAsync(['node', 'test']);

      await vi.waitFor(() => expect(processes.length).toBe(1));
      const viewProc = processes[0].proc;
      (viewProc as any).stdout.emit('data', Buffer.from('2.0.0\n'));
      viewProc.emit('close', 0);

      await vi.waitFor(() => expect(processes.length).toBe(2));
      processes[1].proc.emit('close', 1);

      await parsePromise;

      expect(messages.error).toHaveBeenCalledWith(expect.stringContaining('failed'));
      expect(process.exitCode).toBe(1);
    });

    it('should warn and proceed with upgrade when version check fails', async () => {
      const { spawnFn, processes } = createMockSpawn();
      const cmd = createUpgradeCommand(spawnFn as any);

      const parsePromise = cmd.parseAsync(['node', 'test']);

      // npm view fails with error event
      await vi.waitFor(() => expect(processes.length).toBe(1));
      processes[0].proc.emit('error', new Error('spawn npm ENOENT'));

      // Should still spawn npm install
      await vi.waitFor(() => expect(processes.length).toBe(2));
      processes[1].proc.emit('close', 0);

      await parsePromise;

      expect(messages.warning).toHaveBeenCalledWith(expect.stringContaining('version check'));
      expect(messages.info).toHaveBeenCalledWith(expect.stringContaining('latest'));
      expect(messages.success).toHaveBeenCalled();
    });

    it('should print error and set exitCode=1 when npm install spawn errors', async () => {
      const { spawnFn, processes } = createMockSpawn();
      const cmd = createUpgradeCommand(spawnFn as any);

      const parsePromise = cmd.parseAsync(['node', 'test']);

      // npm view succeeds with newer version
      await vi.waitFor(() => expect(processes.length).toBe(1));
      const viewProc = processes[0].proc;
      (viewProc as any).stdout.emit('data', Buffer.from('2.0.0\n'));
      viewProc.emit('close', 0);

      // npm install spawn errors
      await vi.waitFor(() => expect(processes.length).toBe(2));
      processes[1].proc.emit('error', new Error('spawn npm ENOENT'));

      await parsePromise;

      expect(messages.error).toHaveBeenCalled();
      expect(process.exitCode).toBe(1);
    });

    it('should proceed with upgrade when version check times out', async () => {
      vi.useFakeTimers();
      const { spawnFn, processes } = createMockSpawn();
      const cmd = createUpgradeCommand(spawnFn as any);

      const parsePromise = cmd.parseAsync(['node', 'test']);

      await vi.waitFor(() => expect(processes.length).toBe(1));

      // Advance past the 10-second timeout
      vi.advanceTimersByTime(11_000);

      // Should spawn npm install after timeout
      await vi.waitFor(() => expect(processes.length).toBe(2));
      processes[1].proc.emit('close', 0);

      await parsePromise;

      expect(messages.warning).toHaveBeenCalledWith(expect.stringContaining('version check'));
      expect(messages.success).toHaveBeenCalled();

      vi.useRealTimers();
    });
  });
});
