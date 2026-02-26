// @vitest-environment node

/**
 * DeploymentService Unit Tests
 *
 * Tests for the deployment lifecycle service: start, stop, getStatus, stopAll.
 * Uses dependency injection for child_process.spawn to enable unit testing.
 *
 * TDD Phase: RED → GREEN
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EventEmitter } from 'node:events';
import {
  DeploymentService,
  type DeploymentServiceDeps,
} from '@/infrastructure/services/deployment/deployment.service.js';
import { DeploymentState } from '@/domain/generated/output.js';

/**
 * Create a mock ChildProcess that emits events and has controllable streams.
 */
function createMockChild() {
  const child = new EventEmitter() as EventEmitter & {
    pid: number;
    stdout: EventEmitter;
    stderr: EventEmitter;
    killed: boolean;
    unref: ReturnType<typeof vi.fn>;
  };
  child.pid = 12345;
  child.stdout = new EventEmitter();
  child.stderr = new EventEmitter();
  child.killed = false;
  child.unref = vi.fn();
  return child;
}

function createMockDeps(mockChild?: ReturnType<typeof createMockChild>): DeploymentServiceDeps {
  const child = mockChild ?? createMockChild();
  return {
    spawn: vi.fn().mockReturnValue(child),
    detectDevScript: vi.fn().mockReturnValue({
      success: true,
      packageManager: 'npm',
      scriptName: 'dev',
      command: 'npm run dev',
    }),
    kill: vi.fn(),
    isAlive: vi.fn().mockReturnValue(false),
  };
}

describe('DeploymentService', () => {
  let service: DeploymentService;
  let deps: DeploymentServiceDeps;
  let mockChild: ReturnType<typeof createMockChild>;

  beforeEach(() => {
    vi.useFakeTimers();
    mockChild = createMockChild();
    deps = createMockDeps(mockChild);
    service = new DeploymentService(deps);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('start', () => {
    it('should call spawn with correct args (shell, cwd, detached)', () => {
      service.start('feature-1', '/project/path');

      expect(deps.spawn).toHaveBeenCalledWith(
        'npm',
        ['run', 'dev'],
        expect.objectContaining({
          shell: true,
          cwd: '/project/path',
          detached: true,
          stdio: ['ignore', 'pipe', 'pipe'],
        })
      );
    });

    it('should store entry in Map with Booting state', () => {
      service.start('feature-1', '/project/path');

      const status = service.getStatus('feature-1');
      expect(status).toEqual({
        state: DeploymentState.Booting,
        url: null,
      });
    });

    it('should stop existing deployment for same targetId before spawning new one', () => {
      // Start first deployment
      service.start('feature-1', '/project/path');

      // Create a second mock child for the replacement
      const secondChild = createMockChild();
      secondChild.pid = 54321;
      (deps.spawn as ReturnType<typeof vi.fn>).mockReturnValue(secondChild);

      // Start second deployment for same target — should stop first
      service.start('feature-1', '/project/path');

      // The first process should have been killed
      expect(deps.kill).toHaveBeenCalledWith(-12345, 'SIGKILL');

      // Status should reflect the new deployment
      const status = service.getStatus('feature-1');
      expect(status).toEqual({
        state: DeploymentState.Booting,
        url: null,
      });
    });

    it('should use pnpm command format when detected', () => {
      (deps.detectDevScript as ReturnType<typeof vi.fn>).mockReturnValue({
        success: true,
        packageManager: 'pnpm',
        scriptName: 'dev',
        command: 'pnpm dev',
      });

      service.start('feature-1', '/project/path');

      expect(deps.spawn).toHaveBeenCalledWith('pnpm', ['dev'], expect.any(Object));
    });

    it('should throw when detectDevScript fails', () => {
      (deps.detectDevScript as ReturnType<typeof vi.fn>).mockReturnValue({
        success: false,
        error: 'No package.json found',
      });

      expect(() => service.start('feature-1', '/project/path')).toThrow('No package.json found');
    });

    it('should throw when spawn returns no pid', () => {
      const noPidChild = createMockChild();
      (noPidChild as any).pid = undefined;
      (deps.spawn as ReturnType<typeof vi.fn>).mockReturnValue(noPidChild);

      expect(() => service.start('feature-1', '/project/path')).toThrow(
        'Failed to spawn dev server: no PID returned'
      );
    });
  });

  describe('stdout port detection', () => {
    it('should transition state to Ready when parsePort matches', () => {
      service.start('feature-1', '/project/path');

      // Simulate stdout data with a URL
      mockChild.stdout.emit('data', Buffer.from('  Local:   http://localhost:3000/\n'));

      const status = service.getStatus('feature-1');
      expect(status).toEqual({
        state: DeploymentState.Ready,
        url: 'http://localhost:3000/',
      });
    });

    it('should not transition on non-matching stdout output', () => {
      service.start('feature-1', '/project/path');

      mockChild.stdout.emit('data', Buffer.from('Compiling...\n'));

      const status = service.getStatus('feature-1');
      expect(status).toEqual({
        state: DeploymentState.Booting,
        url: null,
      });
    });

    it('should handle partial lines across chunks', () => {
      service.start('feature-1', '/project/path');

      // First chunk: partial line
      mockChild.stdout.emit('data', Buffer.from('  Local:   http://local'));
      expect(service.getStatus('feature-1')?.state).toBe(DeploymentState.Booting);

      // Second chunk: rest of line with newline
      mockChild.stdout.emit('data', Buffer.from('host:3000/\n'));
      expect(service.getStatus('feature-1')?.state).toBe(DeploymentState.Ready);
      expect(service.getStatus('feature-1')?.url).toBe('http://localhost:3000/');
    });

    it('should detect port from stderr as well', () => {
      service.start('feature-1', '/project/path');

      mockChild.stderr.emit('data', Buffer.from('Server listening on port 8080\n'));

      const status = service.getStatus('feature-1');
      expect(status).toEqual({
        state: DeploymentState.Ready,
        url: 'http://localhost:8080',
      });
    });
  });

  describe('getStatus', () => {
    it('should return state and url for tracked deployment', () => {
      service.start('feature-1', '/project/path');

      const status = service.getStatus('feature-1');
      expect(status).toEqual({
        state: DeploymentState.Booting,
        url: null,
      });
    });

    it('should return null for unknown targetId', () => {
      const status = service.getStatus('unknown-id');
      expect(status).toBeNull();
    });
  });

  describe('stop', () => {
    it('should send SIGTERM to negative pid (process group)', async () => {
      service.start('feature-1', '/project/path');

      const stopPromise = service.stop('feature-1');

      // Advance timers to let pollUntilDead complete (isAlive returns false)
      await vi.advanceTimersByTimeAsync(300);

      // Simulate process exit
      mockChild.emit('exit', 0, null);

      await stopPromise;

      expect(deps.kill).toHaveBeenCalledWith(-12345, 'SIGTERM');
    });

    it('should send SIGKILL after timeout if process still alive', async () => {
      (deps.isAlive as ReturnType<typeof vi.fn>).mockReturnValue(true);

      service.start('feature-1', '/project/path');

      const stopPromise = service.stop('feature-1');

      // Advance through polling interval + timeout
      // The stop method polls every 200ms for 5000ms
      await vi.advanceTimersByTimeAsync(5200);

      // Process finally exits after SIGKILL
      (deps.isAlive as ReturnType<typeof vi.fn>).mockReturnValue(false);
      mockChild.emit('exit', null, 'SIGKILL');

      await stopPromise;

      expect(deps.kill).toHaveBeenCalledWith(-12345, 'SIGTERM');
      expect(deps.kill).toHaveBeenCalledWith(-12345, 'SIGKILL');
    });

    it('should resolve immediately for unknown targetId', async () => {
      await service.stop('unknown-id');
      expect(deps.kill).not.toHaveBeenCalled();
    });

    it('should remove entry from map after process exits', async () => {
      service.start('feature-1', '/project/path');

      const stopPromise = service.stop('feature-1');

      // Advance timers to let pollUntilDead complete (isAlive returns false)
      await vi.advanceTimersByTimeAsync(300);

      // Simulate process exit
      mockChild.emit('exit', 0, null);

      await stopPromise;

      expect(service.getStatus('feature-1')).toBeNull();
    });
  });

  describe('process exit handler', () => {
    it('should remove entry from Map when process exits spontaneously', () => {
      service.start('feature-1', '/project/path');
      expect(service.getStatus('feature-1')).not.toBeNull();

      // Process exits on its own (e.g., crash)
      mockChild.emit('exit', 1, null);

      expect(service.getStatus('feature-1')).toBeNull();
    });
  });

  describe('stopAll', () => {
    it('should terminate all tracked deployments', async () => {
      // Start two deployments
      service.start('feature-1', '/project/path');

      const secondChild = createMockChild();
      secondChild.pid = 99999;
      (deps.spawn as ReturnType<typeof vi.fn>).mockReturnValue(secondChild);
      service.start('feature-2', '/project/path2');

      service.stopAll();

      // Both process groups should have been killed
      expect(deps.kill).toHaveBeenCalledWith(-12345, 'SIGKILL');
      expect(deps.kill).toHaveBeenCalledWith(-99999, 'SIGKILL');
    });

    it('should clear the deployment map', () => {
      service.start('feature-1', '/project/path');

      service.stopAll();
      // Simulate exit events after SIGKILL
      mockChild.emit('exit', null, 'SIGKILL');

      expect(service.getStatus('feature-1')).toBeNull();
    });

    it('should handle empty map gracefully', () => {
      expect(() => service.stopAll()).not.toThrow();
    });
  });

  describe('port detection timeout', () => {
    it('should remain in Booting state after 30s timeout with no port detected', async () => {
      service.start('feature-1', '/project/path');

      // Advance past the 30-second port detection timeout
      await vi.advanceTimersByTimeAsync(31_000);

      const status = service.getStatus('feature-1');
      expect(status?.state).toBe(DeploymentState.Booting);
    });
  });
});
