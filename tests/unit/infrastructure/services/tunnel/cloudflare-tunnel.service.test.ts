/**
 * Cloudflare Tunnel Service Unit Tests
 *
 * Tests for tunnel lifecycle management, URL detection,
 * and URL change notifications.
 *
 * TDD Phase: GREEN
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EventEmitter } from 'node:events';
import { CloudflareTunnelService } from '@/infrastructure/services/tunnel/cloudflare-tunnel.service.js';

vi.mock('@/infrastructure/platform.js', () => ({
  get IS_WINDOWS() {
    return process.platform === 'win32';
  },
}));

function createMockProcess() {
  const proc = new EventEmitter() as EventEmitter & {
    stdout: EventEmitter;
    stderr: EventEmitter;
    killed: boolean;
    kill: ReturnType<typeof vi.fn>;
  };
  proc.stdout = new EventEmitter();
  proc.stderr = new EventEmitter();
  proc.killed = false;
  proc.kill = vi.fn(() => {
    proc.killed = true;
  });
  return proc;
}

describe('CloudflareTunnelService', () => {
  let service: CloudflareTunnelService;
  let mockSpawn: ReturnType<typeof vi.fn>;
  let mockProcess: ReturnType<typeof createMockProcess>;

  beforeEach(() => {
    mockProcess = createMockProcess();
    mockSpawn = vi.fn().mockReturnValue(mockProcess);
    service = new CloudflareTunnelService({ spawnProcess: mockSpawn as any });
  });

  describe('start', () => {
    it('should spawn cloudflared with correct arguments', async () => {
      const startPromise = service.start(3000);

      // Simulate cloudflared emitting its URL on stderr
      mockProcess.stderr.emit(
        'data',
        Buffer.from('INF |  https://test-abc123.trycloudflare.com\n')
      );

      const url = await startPromise;
      expect(url).toBe('https://test-abc123.trycloudflare.com');
      expect(mockSpawn).toHaveBeenCalledWith(
        'cloudflared',
        ['tunnel', '--url', 'http://localhost:3000'],
        expect.objectContaining({ stdio: ['ignore', 'pipe', 'pipe'] })
      );
    });

    it('should detect URL from stdout', async () => {
      const startPromise = service.start(4050);

      mockProcess.stdout.emit('data', Buffer.from('https://my-tunnel-url.trycloudflare.com'));

      const url = await startPromise;
      expect(url).toBe('https://my-tunnel-url.trycloudflare.com');
    });

    it('should reject if process errors with ENOENT', async () => {
      const startPromise = service.start(3000);

      const error = new Error('spawn cloudflared ENOENT') as NodeJS.ErrnoException;
      error.code = 'ENOENT';
      mockProcess.emit('error', error);

      await expect(startPromise).rejects.toThrow("'cloudflared' not found");
    });

    it('should reject if process exits before emitting URL', async () => {
      const startPromise = service.start(3000);

      mockProcess.emit('close', 1);

      await expect(startPromise).rejects.toThrow('exited with code 1');
    });

    it('should throw if tunnel is already running', async () => {
      const startPromise = service.start(3000);
      mockProcess.stderr.emit('data', Buffer.from('https://first.trycloudflare.com'));
      await startPromise;

      await expect(service.start(3000)).rejects.toThrow('already running');
    });

    it('should report isRunning correctly', async () => {
      expect(service.isRunning()).toBe(false);

      const startPromise = service.start(3000);
      mockProcess.stderr.emit('data', Buffer.from('https://test.trycloudflare.com'));
      await startPromise;

      expect(service.isRunning()).toBe(true);
      expect(service.getPublicUrl()).toBe('https://test.trycloudflare.com');
    });
  });

  describe('URL change detection', () => {
    it('should notify handlers when URL changes', async () => {
      const handler = vi.fn();
      service.onUrlChange(handler);

      const startPromise = service.start(3000);
      mockProcess.stderr.emit('data', Buffer.from('https://first-url.trycloudflare.com'));
      await startPromise;

      // Simulate reconnection with new URL
      mockProcess.stderr.emit('data', Buffer.from('https://second-url.trycloudflare.com'));

      expect(handler).toHaveBeenCalledWith('https://second-url.trycloudflare.com');
      expect(service.getPublicUrl()).toBe('https://second-url.trycloudflare.com');
    });

    it('should not notify when same URL is emitted', async () => {
      const handler = vi.fn();
      service.onUrlChange(handler);

      const startPromise = service.start(3000);
      mockProcess.stderr.emit('data', Buffer.from('https://same-url.trycloudflare.com'));
      await startPromise;

      // Emit same URL again
      mockProcess.stderr.emit('data', Buffer.from('https://same-url.trycloudflare.com'));

      expect(handler).not.toHaveBeenCalled();
    });

    it('should handle async URL change handlers gracefully', async () => {
      const handler = vi.fn().mockRejectedValue(new Error('handler error'));
      service.onUrlChange(handler);

      const startPromise = service.start(3000);
      mockProcess.stderr.emit('data', Buffer.from('https://first.trycloudflare.com'));
      await startPromise;

      // Should not throw even if handler rejects
      mockProcess.stderr.emit('data', Buffer.from('https://second.trycloudflare.com'));

      expect(handler).toHaveBeenCalled();
    });
  });

  describe('stop', () => {
    it('should kill the process and clear URL', async () => {
      const startPromise = service.start(3000);
      mockProcess.stderr.emit('data', Buffer.from('https://test.trycloudflare.com'));
      await startPromise;

      await service.stop();

      expect(mockProcess.kill).toHaveBeenCalledWith('SIGTERM');
      expect(service.isRunning()).toBe(false);
      expect(service.getPublicUrl()).toBeNull();
    });

    it('should be safe to call stop when not running', async () => {
      await expect(service.stop()).resolves.toBeUndefined();
    });
  });
});
