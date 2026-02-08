/**
 * Clear Logs Command
 *
 * Delete old logs with confirmation prompt.
 */

import { Command, Option } from 'commander';
import { confirm } from '@inquirer/prompts';
import { container } from '../../../../infrastructure/di/container.js';
import type { ILogger } from '../../../../application/ports/output/logger.interface.js';
import type { ILogRepository } from '../../../../application/ports/output/log-repository.interface.js';
import { messages, colors } from '../../ui/index.js';

interface ClearOptions {
  days: number;
  force: boolean;
}

/**
 * Create the clear logs command
 */
export function createClearCommand(): Command {
  return new Command('clear')
    .description('Delete logs older than a specified number of days')
    .addOption(
      new Option('--days <n>', 'Delete logs older than N days')
        .default(30)
        .argParser((val) => parseInt(val, 10))
    )
    .addOption(new Option('--force', 'Skip confirmation prompt').default(false))
    .addHelpText(
      'after',
      `
Examples:
  $ shep logs clear                  Delete logs older than 30 days (with confirmation)
  $ shep logs clear --days 7         Delete logs older than 7 days
  $ shep logs clear --days 90 --force  Force delete without confirmation`
    )
    .action(async (options: ClearOptions) => {
      const logger = container.resolve<ILogger>('ILogger');
      const repository = container.resolve<ILogRepository>('ILogRepository');

      try {
        logger.debug('Clearing logs', {
          source: 'cli:logs:clear',
          days: options.days,
          force: options.force,
        });

        // Calculate timestamp threshold
        const daysInMs = options.days * 24 * 60 * 60 * 1000;
        const thresholdTimestamp = Date.now() - daysInMs;

        // Get count of logs to delete (for confirmation)
        const logsToDelete = await repository.count({
          endTime: thresholdTimestamp,
        });

        if (logsToDelete === 0) {
          console.log(colors.muted(`No logs older than ${options.days} days found`));
          return;
        }

        // Confirmation prompt (unless --force)
        if (!options.force) {
          const confirmed = await confirm({
            message: `Delete ${logsToDelete} log(s) older than ${options.days} days?`,
            default: false,
          });

          if (!confirmed) {
            console.log(colors.muted('Cancelled'));
            return;
          }
        }

        // Delete logs
        const deletedCount = await repository.deleteOlderThan(thresholdTimestamp);

        console.log(colors.success(`✓ Deleted ${deletedCount} log(s)`));

        logger.debug('Cleared logs successfully', {
          source: 'cli:logs:clear',
          deletedCount,
          thresholdDays: options.days,
        });
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        logger.error('Failed to clear logs', {
          source: 'cli:logs:clear',
          error: err.message,
          stack: err.stack,
        });
        messages.error('Failed to clear logs', err);
        process.exitCode = 1;
      }
    });
}
