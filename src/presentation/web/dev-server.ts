/**
 * Web UI Development Server
 *
 * Initializes the DI container (same as CLI bootstrap) and starts Next.js
 * programmatically in dev mode. This ensures the globalThis.__shepUseCases
 * bridge is available when running `pnpm dev:web` standalone.
 *
 * Run via: tsx --tsconfig ../../tsconfig.json dev-server.ts
 */

/* eslint-disable no-console */

// IMPORTANT: reflect-metadata must be imported first for tsyringe DI
import 'reflect-metadata';

import next from 'next';
import http from 'node:http';
import { initializeContainer, container } from '../../infrastructure/di/container.js';
import { InitializeSettingsUseCase } from '../../application/use-cases/settings/initialize-settings.use-case.js';
import { ListFeaturesUseCase } from '../../application/use-cases/features/list-features.use-case.js';
import type { IAgentRunRepository } from '../../application/ports/output/agents/agent-run-repository.interface.js';
import { initializeSettings } from '../../infrastructure/services/settings.service.js';

const DEFAULT_PORT = 3000;

async function main() {
  const port = parseInt(process.env.PORT ?? '', 10) || DEFAULT_PORT;

  // Step 1: Initialize DI container (database + migrations)
  // Same as CLI bootstrap (src/presentation/cli/index.ts:52-58)
  try {
    await initializeContainer();

    const initSettingsUseCase = container.resolve(InitializeSettingsUseCase);
    const settings = await initSettingsUseCase.execute();
    initializeSettings(settings);

    // Set globalThis bridge for the web layer (same as CLI bootstrap index.ts:74-76)
    (globalThis as Record<string, unknown>).__shepUseCases = {
      listFeatures: container.resolve(ListFeaturesUseCase),
      agentRunRepo: container.resolve<IAgentRunRepository>('IAgentRunRepository'),
    };

    console.log('[dev-server] DI bridge initialized');
  } catch (error) {
    console.warn('[dev-server] DI initialization failed — features will be empty:', error);
  }

  // Step 2: Start Next.js dev server
  const app = next({ dev: true, dir: import.meta.dirname, hostname: 'localhost', port });
  const handle = app.getRequestHandler();
  await app.prepare();

  const server = http.createServer((req, res) => {
    handle(req!, res!);
  });

  await new Promise<void>((resolve, reject) => {
    server.on('error', reject);
    server.listen(port, 'localhost', resolve);
  });

  console.log(`[dev-server] Ready at http://localhost:${port}`);

  // Graceful shutdown
  let isShuttingDown = false;
  const shutdown = async () => {
    if (isShuttingDown) return;
    isShuttingDown = true;
    console.log('\n[dev-server] Shutting down...');
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await app.close();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((error) => {
  console.error('[dev-server] Fatal error:', error);
  process.exit(1);
});
