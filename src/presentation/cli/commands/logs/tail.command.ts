/**
 * Tail Logs Command
 *
 * Live monitoring of logs with real-time updates (polling every 1 second).
 */

import { Command, Option } from 'commander';
import { container } from '../../../../infrastructure/di/container.js';
import type { ILogger } from '../../../../application/ports/output/logger.interface.js';
import type { ILogRepository } from '../../../../application/ports/output/log-repository.interface.js';
import type { LogSearchFilters } from '../../../../domain/generated/output.js';
import { messages, colors } from '../../ui/index.js';

interface TailOptions {
  follow: boolean;
  level?: string;
  source?: string;
}

/**
 * Create the tail logs command
 */
export function createTailCommand(): Command {
  return new Command('tail')
    .description('Follow logs in real-time')
    .addOption(new Option('-f, --follow', 'Follow mode (poll for new logs)').default(true))
    .addOption(
      new Option('--level <level>', 'Filter by log level').choices([
        'debug',
        'info',
        'warn',
        'error',
      ])
    )
    .addOption(new Option('--source <pattern>', 'Filter by log source'))
    .addHelpText(
      'after',
      `
Examples:
  $ shep logs tail                    Follow all logs
  $ shep logs tail --level error      Follow only error logs
  $ shep logs tail --source cli:*     Follow CLI logs

Press Ctrl+C to stop following`
    )
    .action(async (options: TailOptions) => {
      const logger = container.resolve<ILogger>('ILogger');
      const repository = container.resolve<ILogRepository>('ILogRepository');

      let lastTimestamp = Date.now();
      let isRunning = true;

      // Handle Ctrl+C gracefully
      process.on('SIGINT', () => {
        isRunning = false;

        console.log(`\n${colors.muted('Stopped following logs')}`);
        process.exit(0);
      });

      try {
        logger.debug('Tailing logs', {
          source: 'cli:logs:tail',
          filters: { level: options.level, source: options.source },
        });

        console.log(colors.muted('Following logs (Ctrl+C to stop)...\n'));

        // Poll for new logs every second
        while (isRunning) {
          const filters: LogSearchFilters = {
            startTime: lastTimestamp,
            limit: 50,
            offset: 0,
          };

          if (options.level) {
            filters.level = options.level;
          }

          if (options.source) {
            filters.source = options.source;
          }

          const logs = await repository.search(filters);

          // Display new logs
          for (const log of logs) {
            const timestamp = new Date(log.createdAt).toLocaleString();

            console.log(`[${timestamp}] ${log.level.toUpperCase()} ${log.source}: ${log.message}`);

            // Update last timestamp
            if (log.timestamp > lastTimestamp) {
              lastTimestamp = log.timestamp;
            }
          }

          // Wait 1 second before next poll
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        logger.error('Failed to tail logs', {
          source: 'cli:logs:tail',
          error: err.message,
          stack: err.stack,
        });
        messages.error('Failed to tail logs', err);
        process.exitCode = 1;
      }
    });
}
