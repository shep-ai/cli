/**
 * _serve Command (hidden daemon entry point)
 *
 * Runs the web server in-process as a detached daemon child.
 * This command is hidden from --help output and is invoked internally by
 * the startDaemon() helper via child_process.spawn({detached: true}).
 *
 * NOTE: The DI container and settings are already initialized by index.ts
 * bootstrap() before Commander dispatches to this action. This command
 * only needs to start the web server and notification watcher.
 *
 * Lifecycle:
 *   1. Start WebServerService on the provided --port
 *   2. Initialize notification watcher
 *   3. Block until SIGTERM or SIGINT triggers graceful shutdown
 *
 * The shutdown sequence mirrors ui.command.ts:
 *   - Set isShuttingDown flag (idempotent — prevents double-shutdown)
 *   - Start 5s forceExit timer (unref'd so it doesn't block)
 *   - Stop notification watcher
 *   - Stop WebServerService
 *   - process.exit(0)
 *
 * Usage (internal only):
 *   process.execPath _serve --port <N>
 */

import { Command, InvalidArgumentError } from 'commander';
import { container } from '@/infrastructure/di/container.js';
import { setVersionEnvVars } from '@/infrastructure/services/version.service.js';
import { resolveWebDir } from '@/infrastructure/services/web-server.service.js';
import {
  initializeNotificationWatcher,
  getNotificationWatcher,
} from '@/infrastructure/services/notifications/notification-watcher.service.js';
import type { IVersionService } from '@/application/ports/output/services/version-service.interface.js';
import type { IWebServerService } from '@/application/ports/output/services/web-server-service.interface.js';
import type { IAgentRunRepository } from '@/application/ports/output/agents/agent-run-repository.interface.js';
import type { IPhaseTimingRepository } from '@/application/ports/output/agents/phase-timing-repository.interface.js';
import type { INotificationService } from '@/application/ports/output/services/notification-service.interface.js';
import type { IFeatureRepository } from '@/application/ports/output/repositories/feature-repository.interface.js';
import type { IDeploymentService } from '@/application/ports/output/services/deployment-service.interface.js';

function parsePort(value: string): number {
  const port = parseInt(value, 10);
  if (isNaN(port) || port < 1024 || port > 65535) {
    throw new InvalidArgumentError('Port must be an integer between 1024 and 65535');
  }
  return port;
}

/**
 * Create the hidden _serve command (daemon child entry point).
 */
export function createServeCommand(): Command {
  const cmd = new Command('_serve')
    .description('Start the web server daemon (internal use only)')
    .helpOption(false)
    .addHelpCommand(false)
    .option('-p, --port <number>', 'Port to listen on', parsePort)
    .action(async (options: { port?: number }) => {
      try {
        const port = options.port ?? 4050;
        const { dir, dev } = resolveWebDir();

        // Set version env vars for the web UI
        const versionService = container.resolve<IVersionService>('IVersionService');
        setVersionEnvVars(versionService.getVersion());

        // Start the web server
        const service = container.resolve<IWebServerService>('IWebServerService');
        await service.start(port, dir, dev);

        // Start notification watcher
        const runRepo = container.resolve<IAgentRunRepository>('IAgentRunRepository');
        const phaseTimingRepo = container.resolve<IPhaseTimingRepository>('IPhaseTimingRepository');
        const featureRepo = container.resolve<IFeatureRepository>('IFeatureRepository');
        const notificationService = container.resolve<INotificationService>('INotificationService');
        initializeNotificationWatcher(runRepo, phaseTimingRepo, featureRepo, notificationService);
        getNotificationWatcher().start();

        // Graceful shutdown handler — identical pattern to ui.command.ts
        let isShuttingDown = false;
        const shutdown = async () => {
          if (isShuttingDown) return;
          isShuttingDown = true;

          // Force exit after 5s if graceful shutdown stalls
          const forceExit = setTimeout(() => process.exit(0), 5000);
          forceExit.unref();

          getNotificationWatcher().stop();
          const deploymentService = container.resolve<IDeploymentService>('IDeploymentService');
          deploymentService.stopAll();
          await service.stop();
          process.exit(0);
        };

        process.on('SIGTERM', shutdown);
        process.on('SIGINT', shutdown);
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        // Write to stderr so it appears in daemon logs if redirected
        process.stderr.write(`[_serve] Fatal error: ${err.message}\n`);
        process.exit(1);
      }
    });

  // Mark hidden so Commander omits it from --help output
  (cmd as unknown as { _hidden: boolean })._hidden = true;

  return cmd;
}
