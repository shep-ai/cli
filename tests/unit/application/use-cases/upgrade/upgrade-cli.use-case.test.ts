// @vitest-environment node

/**
 * UpgradeCliUseCase Unit Tests
 *
 * Tests for executing CLI self-upgrade with streamed output.
 */

import 'reflect-metadata';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EventEmitter } from 'node:events';
import type { ChildProcess } from 'node:child_process';

// Mock child_process.spawn before importing the use case
const mockSpawn = vi.fn();
vi.mock('node:child_process', () => ({
  spawn: (...args: unknown[]) => mockSpawn(...args),
}));

import { UpgradeCliUseCase } from '@/application/use-cases/upgrade/upgrade-cli.use-case.js';
import type { IVersionService } from '@/application/ports/output/services/version-service.interface.js';
import type { IDaemonService } from '@/application/ports/output/services/daemon-service.interface.js';

function createMockProcess() {
  const proc = new EventEmitter() as ChildProcess & EventEmitter;
  (proc as any).stdout = new EventEmitter();
  (proc as any).stderr = new EventEmitter();
  (proc as any).kill = vi.fn();
  (proc as any).unref = vi.fn();
  return proc;
}

function createVersionService(version = '1.20.0'): IVersionService {
  return {
    getVersion: () => ({
      version,
      name: '@shepai/cli',
      description: 'Autonomous AI Native SDLC Platform',
    }),
  };
}

function createMockDaemonService(port = 4050): IDaemonService {
  return {
    read: vi.fn().mockResolvedValue({ pid: 1234, port, startedAt: new Date().toISOString() }),
    write: vi.fn().mockResolvedValue(undefined),
    delete: vi.fn().mockResolvedValue(undefined),
    isAlive: vi.fn().mockReturnValue(true),
  };
}

describe('UpgradeCliUseCase', () => {
  let useCase: UpgradeCliUseCase;
  let daemonService: IDaemonService;
  const processes: { proc: ReturnType<typeof createMockProcess>; cmd: string; args: string[] }[] =
    [];

  beforeEach(() => {
    vi.clearAllMocks();
    processes.length = 0;

    mockSpawn.mockImplementation((cmd: string, args: string[]) => {
      const proc = createMockProcess();
      processes.push({ proc, cmd, args });
      return proc;
    });

    daemonService = createMockDaemonService();
    useCase = new UpgradeCliUseCase(createVersionService(), daemonService);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('already up to date', () => {
    it('should return up-to-date when latest equals current', async () => {
      const promise = useCase.execute();

      await vi.waitFor(() => expect(processes.length).toBe(1));
      const viewProc = processes[0].proc;
      (viewProc as any).stdout.emit('data', Buffer.from('1.20.0\n'));
      viewProc.emit('close', 0);

      const result = await promise;

      expect(result.status).toBe('up-to-date');
      expect(result.currentVersion).toBe('1.20.0');
      expect(result.latestVersion).toBe('1.20.0');
    });

    it('should not spawn npm install when already up to date', async () => {
      const promise = useCase.execute();

      await vi.waitFor(() => expect(processes.length).toBe(1));
      (processes[0].proc as any).stdout.emit('data', Buffer.from('1.20.0\n'));
      processes[0].proc.emit('close', 0);

      await promise;

      expect(mockSpawn).toHaveBeenCalledTimes(1);
    });
  });

  describe('successful upgrade', () => {
    it('should return upgraded status on successful install', async () => {
      const promise = useCase.execute();

      // npm view returns newer version
      await vi.waitFor(() => expect(processes.length).toBe(1));
      (processes[0].proc as any).stdout.emit('data', Buffer.from('2.0.0\n'));
      processes[0].proc.emit('close', 0);

      // npm install succeeds
      await vi.waitFor(() => expect(processes.length).toBe(2));
      processes[1].proc.emit('close', 0);

      const result = await promise;

      expect(result.status).toBe('upgraded');
      expect(result.currentVersion).toBe('1.20.0');
      expect(result.latestVersion).toBe('2.0.0');
    });

    it('should stream output via onOutput callback', async () => {
      const chunks: string[] = [];
      const onOutput = (data: string) => chunks.push(data);

      const promise = useCase.execute(onOutput);

      await vi.waitFor(() => expect(processes.length).toBe(1));
      (processes[0].proc as any).stdout.emit('data', Buffer.from('2.0.0\n'));
      processes[0].proc.emit('close', 0);

      await vi.waitFor(() => expect(processes.length).toBe(2));
      (processes[1].proc as any).stdout.emit('data', Buffer.from('added 1 package\n'));
      processes[1].proc.emit('close', 0);

      await promise;

      expect(chunks.some((c) => c.includes('added 1 package'))).toBe(true);
    });

    it('should call npm install with correct arguments', async () => {
      const promise = useCase.execute();

      await vi.waitFor(() => expect(processes.length).toBe(1));
      (processes[0].proc as any).stdout.emit('data', Buffer.from('2.0.0\n'));
      processes[0].proc.emit('close', 0);

      await vi.waitFor(() => expect(processes.length).toBe(2));
      processes[1].proc.emit('close', 0);

      await promise;

      expect(processes[1].cmd).toBe('npm');
      expect(processes[1].args).toEqual(['i', '-g', '@shepai/cli@latest']);
    });
  });

  describe('error handling', () => {
    it('should return error status on non-zero exit', async () => {
      const promise = useCase.execute();

      await vi.waitFor(() => expect(processes.length).toBe(1));
      (processes[0].proc as any).stdout.emit('data', Buffer.from('2.0.0\n'));
      processes[0].proc.emit('close', 0);

      await vi.waitFor(() => expect(processes.length).toBe(2));
      processes[1].proc.emit('close', 1);

      const result = await promise;

      expect(result.status).toBe('error');
      expect(result.errorMessage).toContain('exited with code 1');
    });

    it('should return error status when npm install spawn fails', async () => {
      const promise = useCase.execute();

      await vi.waitFor(() => expect(processes.length).toBe(1));
      (processes[0].proc as any).stdout.emit('data', Buffer.from('2.0.0\n'));
      processes[0].proc.emit('close', 0);

      await vi.waitFor(() => expect(processes.length).toBe(2));
      processes[1].proc.emit('error', new Error('spawn npm ENOENT'));

      const result = await promise;

      expect(result.status).toBe('error');
      expect(result.errorMessage).toContain('ENOENT');
    });

    it('should proceed with upgrade when version check fails', async () => {
      const promise = useCase.execute();

      await vi.waitFor(() => expect(processes.length).toBe(1));
      processes[0].proc.emit('error', new Error('spawn npm ENOENT'));

      await vi.waitFor(() => expect(processes.length).toBe(2));
      processes[1].proc.emit('close', 0);

      const result = await promise;

      expect(result.status).toBe('upgraded');
      expect(result.latestVersion).toBeNull();
    });

    it('should proceed with upgrade when version check times out', async () => {
      vi.useFakeTimers();
      const promise = useCase.execute();

      await vi.waitFor(() => expect(processes.length).toBe(1));

      // Advance past timeout
      vi.advanceTimersByTime(11_000);

      await vi.waitFor(() => expect(processes.length).toBe(2));
      processes[1].proc.emit('close', 0);

      const result = await promise;

      expect(result.status).toBe('upgraded');
      expect(result.latestVersion).toBeNull();

      vi.useRealTimers();
    });
  });

  describe('scheduleDaemonRestart', () => {
    let originalExecPath: string;
    let originalExecArgv: string[];
    let originalArgv: string[];
    let exitSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      vi.useFakeTimers();
      originalExecPath = process.execPath;
      originalExecArgv = process.execArgv;
      originalArgv = process.argv;

      process.execPath = '/usr/local/bin/node';
      process.execArgv = [];
      process.argv = ['node', '/usr/local/bin/shep'];

      exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
    });

    afterEach(() => {
      vi.useRealTimers();
      process.execPath = originalExecPath;
      process.execArgv = originalExecArgv;
      process.argv = originalArgv;
      exitSpy.mockRestore();
    });

    it('should delete daemon state before spawning new process', async () => {
      await useCase.scheduleDaemonRestart();

      expect(daemonService.delete).toHaveBeenCalled();
    });

    it('should spawn new daemon process with correct arguments and port', async () => {
      await useCase.scheduleDaemonRestart();

      expect(mockSpawn).toHaveBeenCalledWith(
        '/usr/local/bin/node',
        ['/usr/local/bin/shep', '_serve', '--port', '4050'],
        expect.objectContaining({
          detached: true,
          stdio: 'ignore',
        })
      );
    });

    it('should spawn without --port when daemon state has no port', async () => {
      (daemonService.read as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      await useCase.scheduleDaemonRestart();

      expect(mockSpawn).toHaveBeenCalledWith(
        '/usr/local/bin/node',
        ['/usr/local/bin/shep', '_serve'],
        expect.objectContaining({
          detached: true,
          stdio: 'ignore',
        })
      );
    });

    it('should exit the current process after a delay', async () => {
      await useCase.scheduleDaemonRestart();

      expect(exitSpy).not.toHaveBeenCalled();

      vi.advanceTimersByTime(1_000);

      expect(exitSpy).toHaveBeenCalledWith(0);
    });
  });
});
