/**
 * UI Command
 *
 * Starts the Shep web UI server.
 * Runs Next.js in the same process as the CLI, sharing the DI container.
 *
 * Usage: shep ui [--port <number>]
 *
 * @example
 * $ shep ui
 * Shep Web UI
 * Starting web server...
 *
 * ✓ Server ready at http://localhost:4050
 * ℹ Press Ctrl+C to stop
 */

import { Command, InvalidArgumentError } from 'commander';
import { findAvailablePort, DEFAULT_PORT } from '@/infrastructure/services/port.service.js';
import { container } from '@/infrastructure/di/container.js';
import type { IVersionService } from '@/application/ports/output/services/version-service.interface.js';
import type { IWebServerService } from '@/application/ports/output/services/web-server-service.interface.js';
import type { IAgentRunRepository } from '@/application/ports/output/agents/agent-run-repository.interface.js';
import type { IPhaseTimingRepository } from '@/application/ports/output/agents/phase-timing-repository.interface.js';
import { setVersionEnvVars } from '@/infrastructure/services/version.service.js';
import { resolveWebDir } from '@/infrastructure/services/web-server.service.js';
import { getNotificationBus } from '@/infrastructure/services/notifications/notification-bus.js';
import {
  initializeNotificationWatcher,
  getNotificationWatcher,
} from '@/infrastructure/services/notifications/notification-watcher.service.js';
import { colors, fmt, messages } from '../ui/index.js';

function parsePort(value: string): number {
  const port = parseInt(value, 10);
  if (isNaN(port) || port < 1024 || port > 65535) {
    throw new InvalidArgumentError('Port must be an integer between 1024 and 65535');
  }
  return port;
}

/**
 * Create the ui command
 */
export function createUiCommand(): Command {
  return new Command('ui')
    .description('Start the Shep web UI')
    .option('-p, --port <number>', 'Port number (1024-65535)', parsePort)
    .addHelpText(
      'after',
      `
Examples:
  $ shep ui                 Start on default port (4050)
  $ shep ui --port 8080     Start on custom port`
    )
    .action(async (options: { port?: number }) => {
      try {
        const startPort = options.port ?? DEFAULT_PORT;
        const port = await findAvailablePort(startPort);
        const { dir, dev } = resolveWebDir();

        // Set version env vars so Next.js web UI can read them
        const versionService = container.resolve<IVersionService>('IVersionService');
        setVersionEnvVars(versionService.getVersion());

        messages.newline();
        console.log(fmt.heading('Shep Web UI'));
        console.log(colors.muted(`Starting web server${dev ? ' (dev mode)' : ''}...`));
        messages.newline();

        const service = container.resolve<IWebServerService>('IWebServerService');
        await service.start(port, dir, dev);

        // Start notification watcher to detect agent status transitions
        const runRepo = container.resolve<IAgentRunRepository>('IAgentRunRepository');
        const phaseTimingRepo = container.resolve<IPhaseTimingRepository>('IPhaseTimingRepository');
        const notificationBus = getNotificationBus();
        initializeNotificationWatcher(runRepo, phaseTimingRepo, notificationBus);
        getNotificationWatcher().start();

        messages.success(`Server ready at ${fmt.code(`http://localhost:${port}`)}`);
        messages.info('Press Ctrl+C to stop');
        messages.newline();

        // Handle graceful shutdown via SIGINT/SIGTERM
        // The HTTP server keeps the event loop alive — no explicit wait needed
        let isShuttingDown = false;
        const shutdown = async () => {
          if (isShuttingDown) return;
          isShuttingDown = true;
          messages.newline();
          messages.info('Shutting down...');

          // Force exit after 5s if graceful shutdown stalls
          const forceExit = setTimeout(() => process.exit(0), 5000);
          forceExit.unref();

          getNotificationWatcher().stop();
          await service.stop();
          process.exit(0);
        };

        process.on('SIGINT', shutdown);
        process.on('SIGTERM', shutdown);
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        messages.error('Failed to start web UI', err);
        process.exitCode = 1;
      }
    });
}
