/**
 * Web UI Development Server
 *
 * Initializes the DI container (same as CLI bootstrap) and starts Next.js
 * programmatically in dev mode.
 *
 * Run via: tsx --tsconfig ../../tsconfig.json dev-server.ts
 */

/* eslint-disable no-console */

// IMPORTANT: reflect-metadata must be imported first for tsyringe DI
import 'reflect-metadata';

import next from 'next';
import http from 'node:http';
import net from 'node:net';
import fs from 'node:fs';
import path from 'node:path';
import { initializeContainer, container } from '@/infrastructure/di/container.js';
import { InitializeSettingsUseCase } from '@/application/use-cases/settings/initialize-settings.use-case.js';
import { initializeSettings } from '@/infrastructure/services/settings.service.js';

const DEFAULT_PORT = 3000;

async function isPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host: 'localhost', port });
    socket.on('connect', () => {
      socket.destroy();
      resolve(false); // Port is in use
    });
    socket.on('error', () => {
      resolve(true); // Port is available
    });
    setTimeout(() => {
      socket.destroy();
      resolve(true);
    }, 100);
  });
}

async function findAvailablePort(startPort: number): Promise<number> {
  let port = startPort;
  while (!(await isPortAvailable(port))) {
    port++;
  }
  return port;
}

async function main() {
  const basePort = process.env.PORT !== undefined ? parseInt(process.env.PORT, 10) : DEFAULT_PORT;
  const port = await findAvailablePort(basePort);

  // Step 1: Initialize DI container (database + migrations)
  // Same as CLI bootstrap (src/presentation/cli/index.ts:52-58)
  try {
    await initializeContainer();
    // Expose the DI container on globalThis for the web UI's server-side code
    (globalThis as Record<string, unknown>).__shepContainer = container;

    const initSettingsUseCase = container.resolve(InitializeSettingsUseCase);
    const settings = await initSettingsUseCase.execute();
    initializeSettings(settings);
  } catch (error) {
    console.warn('[dev-server] DI initialization failed — features will be empty:', error);
  }

  // Step 2: Clean up lock file to allow multiple dev instances
  const lockPath = path.join(import.meta.dirname, '.next', 'dev', 'lock');
  try {
    fs.rmSync(lockPath, { force: true });
  } catch {
    // Lock file doesn't exist or couldn't be removed, continue anyway
  }

  // Start Next.js dev server
  const app = next({ dev: true, dir: import.meta.dirname, hostname: 'localhost', port });
  const handle = app.getRequestHandler();
  await app.prepare();

  const server = http.createServer((req, res) => {
    handle(req!, res!);
  });

  // Forward WebSocket upgrades to Next.js for HMR/Fast Refresh
  server.on('upgrade', (req, socket, head) => {
    app.getUpgradeHandler()(req, socket, head);
  });

  await new Promise<void>((resolve, reject) => {
    server.on('error', reject);
    server.listen(port, 'localhost', () => {
      console.log(`[dev-server] Ready at http://localhost:${port}`);
      resolve();
    });
  });

  // Graceful shutdown with timeout to avoid hanging on open connections
  let isShuttingDown = false;
  const shutdown = async () => {
    if (isShuttingDown) return;
    isShuttingDown = true;
    console.log('\n[dev-server] Shutting down...');
    const forceExit = setTimeout(() => process.exit(0), 2000);
    try {
      server.closeAllConnections();
      await Promise.all([
        new Promise<void>((resolve) => server.close(() => resolve())),
        app.close(),
      ]);
    } finally {
      clearTimeout(forceExit);
      process.exit(0);
    }
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((error) => {
  console.error('[dev-server] Fatal error:', error);
  process.exit(1);
});
