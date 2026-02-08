/**
 * Web Server Service Unit Tests
 *
 * Tests for Next.js programmatic server lifecycle management.
 * Uses constructor dependency injection for clean testability.
 *
 * TDD Phase: GREEN
 */

import 'reflect-metadata';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  WebServerService,
  type WebServerDeps,
} from '../../../../src/infrastructure/services/web-server.service.js';

function createMockDeps() {
  const mockHandle = vi.fn();
  const mockApp = {
    prepare: vi.fn().mockResolvedValue(undefined),
    close: vi.fn().mockResolvedValue(undefined),
    getRequestHandler: vi.fn().mockReturnValue(mockHandle),
  };

  const mockServer = {
    listen: vi.fn(),
    close: vi.fn(),
    on: vi.fn().mockReturnThis(),
  };

  // Default: listen calls callback immediately
  mockServer.listen.mockImplementation((_port: number, _hostname: string, callback: () => void) => {
    callback();
    return mockServer;
  });

  // Default: close calls callback immediately
  mockServer.close.mockImplementation((callback?: () => void) => {
    if (callback) callback();
    return mockServer;
  });

  const deps: WebServerDeps = {
    createNextApp: vi.fn().mockReturnValue(mockApp) as any,
    createHttpServer: vi.fn().mockReturnValue(mockServer) as any,
  };

  return { deps, mockApp, mockServer, mockHandle };
}

describe('WebServerService', () => {
  let service: WebServerService;
  let mocks: ReturnType<typeof createMockDeps>;

  beforeEach(() => {
    vi.clearAllMocks();
    mocks = createMockDeps();
    service = new WebServerService(mocks.deps);
  });

  describe('start()', () => {
    it('should call createNextApp with correct options', async () => {
      await service.start(4050, '/path/to/web');

      expect(mocks.deps.createNextApp).toHaveBeenCalledWith({
        dev: true,
        dir: '/path/to/web',
        port: 4050,
        hostname: 'localhost',
      });
    });

    it('should pass dev flag to Next.js', async () => {
      await service.start(4050, '/path/to/web', false);

      expect(mocks.deps.createNextApp).toHaveBeenCalledWith(
        expect.objectContaining({ dev: false })
      );
    });

    it('should call app.prepare()', async () => {
      await service.start(4050, '/path/to/web');

      expect(mocks.mockApp.prepare).toHaveBeenCalled();
    });

    it('should create an HTTP server with the request handler', async () => {
      await service.start(4050, '/path/to/web');

      expect(mocks.mockApp.getRequestHandler).toHaveBeenCalled();
      expect(mocks.deps.createHttpServer).toHaveBeenCalledWith(expect.any(Function));
    });

    it('should listen on the specified port', async () => {
      await service.start(4050, '/path/to/web');

      expect(mocks.mockServer.listen).toHaveBeenCalledWith(4050, 'localhost', expect.any(Function));
    });
  });

  describe('stop()', () => {
    it('should close the HTTP server', async () => {
      await service.start(4050, '/path/to/web');
      await service.stop();

      expect(mocks.mockServer.close).toHaveBeenCalled();
    });

    it('should close the Next.js app', async () => {
      await service.start(4050, '/path/to/web');
      await service.stop();

      expect(mocks.mockApp.close).toHaveBeenCalled();
    });

    it('should be safe to call stop() without start()', async () => {
      await expect(service.stop()).resolves.not.toThrow();
    });
  });

  describe('error handling', () => {
    it('should propagate error when app.prepare() rejects', async () => {
      mocks.mockApp.prepare.mockRejectedValueOnce(new Error('Prepare failed'));

      await expect(service.start(4050, '/path/to/web')).rejects.toThrow('Prepare failed');
    });
  });
});
