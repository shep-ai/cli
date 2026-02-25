/**
 * startDaemon() Helper Unit Tests
 *
 * Tests for the shared daemon-spawn helper used by both the default
 * `shep` action and `shep start`.
 *
 * TDD Phase: RED
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---- child_process.spawn mock ------------------------------------------------
const { mockChild, mockSpawn } = vi.hoisted(() => {
  const mockChild = {
    pid: 9999,
    unref: vi.fn(),
  };
  const mockSpawn = vi.fn().mockReturnValue(mockChild);
  return { mockChild, mockSpawn };
});

vi.mock('node:child_process', () => ({
  spawn: mockSpawn,
}));

// ---- IDaemonService mock + BrowserOpenerService mock (hoisted — referenced in vi.mock factories) ----
const { mockDaemonService, mockBrowserOpen } = vi.hoisted(() => {
  const mockDaemonService = {
    read: vi.fn(),
    write: vi.fn().mockResolvedValue(undefined),
    delete: vi.fn().mockResolvedValue(undefined),
    isAlive: vi.fn(),
  };
  const mockBrowserOpen = vi.fn();
  return { mockDaemonService, mockBrowserOpen };
});

vi.mock('@/infrastructure/services/browser-opener.service.js', () => ({
  BrowserOpenerService: vi.fn().mockImplementation(function () {
    return { open: mockBrowserOpen };
  }),
}));

vi.mock('@/infrastructure/di/container.js', () => ({
  container: {
    resolve: vi.fn().mockImplementation((token: string) => {
      if (token === 'IDaemonService') return mockDaemonService;
      throw new Error(`Unknown token: ${token}`);
    }),
  },
}));

// ---- Port service mock -------------------------------------------------------
vi.mock('@/infrastructure/services/port.service.js', () => ({
  findAvailablePort: vi.fn().mockResolvedValue(4050),
  DEFAULT_PORT: 4050,
}));

// ---- CLI UI mocks (suppress console output) ----------------------------------
vi.mock('src/presentation/cli/ui/index.js', () => ({
  colors: {
    success: vi.fn((s: string) => s),
    muted: vi.fn((s: string) => s),
    info: vi.fn((s: string) => s),
    bold: vi.fn((s: string) => s),
  },
  fmt: {
    heading: vi.fn((s: string) => s),
    code: vi.fn((s: string) => s),
  },
  messages: {
    success: vi.fn(),
    info: vi.fn(),
    newline: vi.fn(),
    warning: vi.fn(),
  },
}));

import { findAvailablePort } from '@/infrastructure/services/port.service.js';
import { BrowserOpenerService } from '@/infrastructure/services/browser-opener.service.js';
import { startDaemon } from '../../../../src/presentation/cli/commands/daemon/start-daemon.js';

describe('startDaemon()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockChild.unref.mockClear();
    mockSpawn.mockReturnValue(mockChild);
    mockDaemonService.read.mockResolvedValue(null);
    mockDaemonService.isAlive.mockReturnValue(false);
    (findAvailablePort as ReturnType<typeof vi.fn>).mockResolvedValue(4050);
  });

  describe('already-running path (idempotent)', () => {
    it('does NOT spawn a new process when daemon is already alive', async () => {
      mockDaemonService.read.mockResolvedValue({
        pid: 1234,
        port: 4050,
        startedAt: '2026-01-01T00:00:00.000Z',
      });
      mockDaemonService.isAlive.mockReturnValue(true);

      await startDaemon();

      expect(mockSpawn).not.toHaveBeenCalled();
    });

    it('does NOT write daemon.json when daemon is already alive', async () => {
      mockDaemonService.read.mockResolvedValue({
        pid: 1234,
        port: 4050,
        startedAt: '2026-01-01T00:00:00.000Z',
      });
      mockDaemonService.isAlive.mockReturnValue(true);

      await startDaemon();

      expect(mockDaemonService.write).not.toHaveBeenCalled();
    });
  });

  describe('fresh-start path (no existing daemon)', () => {
    it('calls findAvailablePort with DEFAULT_PORT when no port option given', async () => {
      await startDaemon();
      expect(findAvailablePort).toHaveBeenCalledWith(4050);
    });

    it('calls findAvailablePort with the provided port override', async () => {
      (findAvailablePort as ReturnType<typeof vi.fn>).mockResolvedValue(8080);
      await startDaemon({ port: 8080 });
      expect(findAvailablePort).toHaveBeenCalledWith(8080);
    });

    it('spawns the daemon process using process.execPath and _serve args', async () => {
      (findAvailablePort as ReturnType<typeof vi.fn>).mockResolvedValue(4050);
      await startDaemon();
      expect(mockSpawn).toHaveBeenCalledWith(
        process.execPath,
        expect.arrayContaining(['_serve', '--port', '4050']),
        expect.any(Object)
      );
    });

    it('spawns with detached: true', async () => {
      await startDaemon();
      const spawnOpts = mockSpawn.mock.calls[0][2];
      expect(spawnOpts).toMatchObject({ detached: true });
    });

    it('spawns with stdio: "ignore"', async () => {
      await startDaemon();
      const spawnOpts = mockSpawn.mock.calls[0][2];
      expect(spawnOpts).toMatchObject({ stdio: 'ignore' });
    });

    it('calls child.unref() immediately after spawn', async () => {
      await startDaemon();
      expect(mockChild.unref).toHaveBeenCalled();
    });

    it('writes daemon.json with pid, port, and startedAt', async () => {
      (findAvailablePort as ReturnType<typeof vi.fn>).mockResolvedValue(4050);
      await startDaemon();
      expect(mockDaemonService.write).toHaveBeenCalledWith(
        expect.objectContaining({
          pid: 9999,
          port: 4050,
          startedAt: expect.any(String),
        })
      );
    });

    it('writes a valid ISO 8601 timestamp to startedAt', async () => {
      await startDaemon();
      const written = mockDaemonService.write.mock.calls[0][0];
      expect(() => new Date(written.startedAt).toISOString()).not.toThrow();
    });

    it('opens the browser with the correct URL', async () => {
      (findAvailablePort as ReturnType<typeof vi.fn>).mockResolvedValue(4050);
      await startDaemon();
      expect(BrowserOpenerService).toHaveBeenCalled();
      expect(mockBrowserOpen).toHaveBeenCalledWith('http://localhost:4050');
    });

    it('opens the browser with the custom port URL when --port is given', async () => {
      (findAvailablePort as ReturnType<typeof vi.fn>).mockResolvedValue(7070);
      await startDaemon({ port: 7070 });
      expect(mockBrowserOpen).toHaveBeenCalledWith('http://localhost:7070');
    });
  });
});
