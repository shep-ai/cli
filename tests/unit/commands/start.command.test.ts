/**
 * start command unit tests
 *
 * Tests for the `shep start` CLI command.
 * The command is intentionally thin — all logic lives in startDaemon().
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Command } from 'commander';

// Mock startDaemon so we can verify delegation
vi.mock('../../../src/presentation/cli/commands/daemon/start-daemon.js', () => ({
  startDaemon: vi.fn().mockResolvedValue(undefined),
}));

import { startDaemon } from '../../../src/presentation/cli/commands/daemon/start-daemon.js';
import { createStartCommand } from '../../../src/presentation/cli/commands/start.command.js';

describe('start command', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('command structure', () => {
    it('returns a Commander Command instance', () => {
      const cmd = createStartCommand();
      expect(cmd).toBeInstanceOf(Command);
    });

    it('has name "start"', () => {
      const cmd = createStartCommand();
      expect(cmd.name()).toBe('start');
    });

    it('has a --port / -p option', () => {
      const cmd = createStartCommand();
      const portOption = cmd.options.find((o) => o.long === '--port');
      expect(portOption).toBeDefined();
      expect(portOption?.short).toBe('-p');
    });
  });

  describe('command execution', () => {
    it('calls startDaemon with port: undefined when no --port given', async () => {
      const cmd = createStartCommand();
      await cmd.parseAsync([], { from: 'user' });
      expect(startDaemon).toHaveBeenCalledWith({ port: undefined });
    });

    it('calls startDaemon with port: 5000 when --port 5000 is given', async () => {
      const cmd = createStartCommand();
      await cmd.parseAsync(['--port', '5000'], { from: 'user' });
      expect(startDaemon).toHaveBeenCalledWith({ port: 5000 });
    });

    it('calls startDaemon with port: 8080 when -p 8080 is given', async () => {
      const cmd = createStartCommand();
      await cmd.parseAsync(['-p', '8080'], { from: 'user' });
      expect(startDaemon).toHaveBeenCalledWith({ port: 8080 });
    });
  });

  describe('port validation', () => {
    it('throws InvalidArgumentError for port below 1024', async () => {
      const cmd = createStartCommand();
      // Commander calls process.exit on parse errors when error handling is not suppressed
      // Use exitOverride to capture the error instead
      cmd.exitOverride();
      await expect(cmd.parseAsync(['--port', '80'], { from: 'user' })).rejects.toThrow();
    });

    it('throws InvalidArgumentError for port above 65535', async () => {
      const cmd = createStartCommand();
      cmd.exitOverride();
      await expect(cmd.parseAsync(['--port', '99999'], { from: 'user' })).rejects.toThrow();
    });

    it('throws InvalidArgumentError for non-numeric port', async () => {
      const cmd = createStartCommand();
      cmd.exitOverride();
      await expect(cmd.parseAsync(['--port', 'abc'], { from: 'user' })).rejects.toThrow();
    });
  });
});
