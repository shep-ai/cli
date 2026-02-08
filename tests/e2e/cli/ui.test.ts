/**
 * CLI UI Command E2E Tests
 *
 * Tests for the `shep ui` command that starts the integrated web UI server.
 * Verifies the server starts correctly on the default port, respects custom
 * port flags, and handles port conflicts by auto-incrementing.
 *
 * These tests spawn actual server processes and make HTTP requests to validate
 * the /version page content. Generous timeouts are used because Next.js dev
 * mode compilation can take 30-60 seconds on first request.
 */

import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { createServer, type Server } from 'node:net';
import { rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { startCliServer, type ServerProcess } from '../../helpers/cli/server.js';

// Next.js shutdown can be slow — increase hook timeout from default 10s
vi.setConfig({ hookTimeout: 30_000 });

/** Path to Next.js dev lock file */
const NEXT_LOCK_FILE = resolve(__dirname, '../../../src/presentation/web/.next/dev/lock');

/** Track all servers started during tests for cleanup */
const servers: ServerProcess[] = [];

/** Track any net servers used for port blocking */
const blockingServers: Server[] = [];

/**
 * Helper to start a CLI server and track it for cleanup
 */
async function startTrackedServer(
  ...args: Parameters<typeof startCliServer>
): Promise<ServerProcess> {
  const server = await startCliServer(...args);
  servers.push(server);
  return server;
}

/**
 * Helper to block a port with a plain TCP server
 */
function blockPort(port: number): Promise<Server> {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.listen(port, '127.0.0.1', () => {
      blockingServers.push(server);
      resolve(server);
    });
    server.on('error', reject);
  });
}

describe('CLI: ui', { timeout: 180_000 }, () => {
  beforeEach(() => {
    // Remove stale Next.js dev lock file to prevent cascading failures
    try {
      rmSync(NEXT_LOCK_FILE, { force: true });
    } catch {
      // Ignore if file doesn't exist
    }
  });

  afterEach(async () => {
    // Stop all tracked CLI server processes
    const stopPromises = servers.map((s) => s.stop());
    await Promise.all(stopPromises);
    servers.length = 0;

    // Close all blocking servers
    const closePromises = blockingServers.map(
      (s) => new Promise<void>((resolve) => s.close(() => resolve()))
    );
    await Promise.all(closePromises);
    blockingServers.length = 0;
  });

  describe('default port behavior', () => {
    it('should start on port 4050 and serve the /version page', async () => {
      // Act
      const server = await startTrackedServer();

      // Assert - should start on default port 4050
      expect(server.port).toBe(4050);

      // Fetch the /version page
      const response = await fetch(`http://localhost:${server.port}/version`);
      expect(response.status).toBe(200);

      const html = await response.text();
      expect(html).toContain('@shepai/cli');
      expect(html).toContain('Autonomous AI Native SDLC Platform');
    }, 120_000);
  });

  describe('custom port via --port flag', () => {
    it('should start on the specified port', async () => {
      // Act
      const server = await startTrackedServer('--port 14050');

      // Assert - should start on custom port
      expect(server.port).toBe(14050);

      // Fetch the /version page
      const response = await fetch(`http://localhost:14050/version`);
      expect(response.status).toBe(200);

      const html = await response.text();
      expect(html).toContain('@shepai/cli');
    }, 120_000);
  });

  describe('port conflict handling', () => {
    it('should auto-increment to next port when default port is occupied', async () => {
      // Arrange - block the default port 4050
      await blockPort(4050);

      // Act - start without specifying port, should auto-increment
      const server = await startTrackedServer();

      // Assert - should have found the next available port
      expect(server.port).toBe(4051);

      // Fetch the /version page on the auto-incremented port
      const response = await fetch(`http://localhost:${server.port}/version`);
      expect(response.status).toBe(200);
    }, 120_000);
  });
});
