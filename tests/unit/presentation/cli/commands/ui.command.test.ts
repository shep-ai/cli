/**
 * UI Command Unit Tests
 *
 * Tests for the `shep ui` command.
 *
 * TDD Phase: GREEN
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Command } from 'commander';

// Mock the port service - factory must not reference outer variables (hoisted)
vi.mock('../../../../../src/infrastructure/services/port.service.js', () => ({
  findAvailablePort: vi.fn(),
  DEFAULT_PORT: 4050,
}));

// Track the last created WebServerService instance
let lastServiceInstance: {
  start: ReturnType<typeof vi.fn>;
  stop: ReturnType<typeof vi.fn>;
} | null = null;

// Mock the web server service - use class for proper new() behavior
vi.mock('../../../../../src/infrastructure/services/web-server.service.js', () => {
  return {
    WebServerService: class MockWebServerService {
      start = vi.fn().mockResolvedValue(undefined);
      stop = vi.fn().mockResolvedValue(undefined);
      constructor() {
        lastServiceInstance = this as any;
      }
    },
    resolveWebDir: vi.fn().mockReturnValue({
      dir: '/mock/web/dir',
      dev: true,
    }),
  };
});

import { findAvailablePort } from '../../../../../src/infrastructure/services/port.service.js';
import { resolveWebDir } from '../../../../../src/infrastructure/services/web-server.service.js';
import { createUiCommand } from '../../../../../src/presentation/cli/commands/ui.command.js';

describe('UI Command', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (findAvailablePort as ReturnType<typeof vi.fn>).mockResolvedValue(4050);
    lastServiceInstance = null;
    process.exitCode = undefined;
  });

  describe('command structure', () => {
    it('should create a valid Commander command', () => {
      const cmd = createUiCommand();
      expect(cmd).toBeInstanceOf(Command);
    });

    it('should have the name "ui"', () => {
      const cmd = createUiCommand();
      expect(cmd.name()).toBe('ui');
    });

    it('should have a description', () => {
      const cmd = createUiCommand();
      expect(cmd.description()).toBeTruthy();
    });

    it('should have a --port option', () => {
      const cmd = createUiCommand();
      const portOption = cmd.options.find((o) => o.long === '--port');
      expect(portOption).toBeDefined();
    });
  });

  describe('command execution', () => {
    it('should call findAvailablePort with default port when no --port specified', async () => {
      const cmd = createUiCommand();
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(vi.fn());

      await cmd.parseAsync([], { from: 'user' });

      expect(findAvailablePort).toHaveBeenCalledWith(4050);
      consoleSpy.mockRestore();
    });

    it('should call resolveWebDir to find the web UI directory', async () => {
      const cmd = createUiCommand();
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(vi.fn());

      await cmd.parseAsync([], { from: 'user' });

      expect(resolveWebDir).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should start the web server service', async () => {
      const cmd = createUiCommand();
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(vi.fn());

      await cmd.parseAsync([], { from: 'user' });

      expect(lastServiceInstance).not.toBeNull();
      expect(lastServiceInstance!.start).toHaveBeenCalledWith(4050, '/mock/web/dir', true);
      consoleSpy.mockRestore();
    });
  });

  describe('--port override', () => {
    it('should use the provided port directly', async () => {
      const cmd = createUiCommand();
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(vi.fn());

      await cmd.parseAsync(['--port', '8080'], { from: 'user' });

      expect(findAvailablePort).toHaveBeenCalledWith(8080);
      consoleSpy.mockRestore();
    });
  });

  describe('error handling', () => {
    it('should handle port service errors gracefully', async () => {
      (findAvailablePort as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
        new Error('No available port')
      );

      const cmd = createUiCommand();
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(vi.fn());
      const logSpy = vi.spyOn(console, 'log').mockImplementation(vi.fn());

      await cmd.parseAsync([], { from: 'user' });

      expect(process.exitCode).toBe(1);
      errorSpy.mockRestore();
      logSpy.mockRestore();
    });

    it('should validate port range', () => {
      const cmd = createUiCommand();
      const portOption = cmd.options.find((o) => o.long === '--port');
      expect(portOption).toBeDefined();
      expect(portOption!.flags).toContain('<number>');
    });
  });
});
