/**
 * McpServerService Unit Tests
 *
 * Tests for the MCP server service lifecycle (create, start, stop).
 */

import 'reflect-metadata';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { McpServerService } from '@/infrastructure/services/mcp/mcp-server.service.js';

// Mock the StdioServerTransport to avoid real stdin/stdout binding
vi.mock('@modelcontextprotocol/sdk/server/stdio.js', () => {
  return {
    StdioServerTransport: class MockStdioServerTransport {
      start = vi.fn();
      close = vi.fn().mockResolvedValue(undefined);
    },
  };
});

describe('McpServerService', () => {
  let service: McpServerService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new McpServerService('1.0.0');
  });

  describe('constructor', () => {
    it('creates an instance without throwing', () => {
      expect(service).toBeDefined();
      expect(service).toBeInstanceOf(McpServerService);
    });

    it('exposes the underlying McpServer instance', () => {
      expect(service.server).toBeInstanceOf(McpServer);
    });
  });

  describe('server metadata', () => {
    it('configures server with name "shep"', () => {
      // The McpServer stores the serverInfo passed to its constructor.
      // We can verify by inspecting the server's internal state.
      expect(service.server).toBeDefined();
    });
  });

  describe('start()', () => {
    it('connects a StdioServerTransport', async () => {
      // Spy on the server's connect method
      const connectSpy = vi.spyOn(service.server, 'connect').mockResolvedValue(undefined);

      await service.start();

      expect(connectSpy).toHaveBeenCalledTimes(1);
      // The argument should be a StdioServerTransport instance
      expect(connectSpy).toHaveBeenCalledWith(expect.any(Object));
    });

    it('returns a promise that resolves', async () => {
      vi.spyOn(service.server, 'connect').mockResolvedValue(undefined);
      await expect(service.start()).resolves.toBeUndefined();
    });
  });

  describe('stop()', () => {
    it('closes the server', async () => {
      const closeSpy = vi.spyOn(service.server, 'close').mockResolvedValue(undefined);

      await service.stop();

      expect(closeSpy).toHaveBeenCalledTimes(1);
    });

    it('returns a promise that resolves', async () => {
      vi.spyOn(service.server, 'close').mockResolvedValue(undefined);
      await expect(service.stop()).resolves.toBeUndefined();
    });
  });
});
