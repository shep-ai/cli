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

function createMockProcess() {
  const proc = new EventEmitter() as ChildProcess & EventEmitter;
  (proc as any).stdout = new EventEmitter();
  (proc as any).stderr = new EventEmitter();
  (proc as any).kill = vi.fn();
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

describe('UpgradeCliUseCase', () => {
  let useCase: UpgradeCliUseCase;
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

    useCase = new UpgradeCliUseCase(createVersionService());
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
});
