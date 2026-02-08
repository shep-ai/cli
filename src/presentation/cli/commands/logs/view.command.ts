/**
 * View Log Command
 *
 * Display detailed information for a single log entry.
 */

import { Command, Option } from 'commander';
import { container } from '../../../../infrastructure/di/container.js';
import type { ILogger } from '../../../../application/ports/output/logger.interface.js';
import type { ILogRepository } from '../../../../application/ports/output/log-repository.interface.js';
import { messages } from '../../ui/index.js';
import { formatLogDetail } from '../../ui/formatters/logs.js';
import yaml from 'yaml';

interface ViewOptions {
  output: 'pretty' | 'json' | 'yaml';
}

/**
 * Create the view log command
 */
export function createViewCommand(): Command {
  return new Command('view')
    .description('View details of a specific log entry')
    .argument('<id>', 'Log entry ID')
    .addOption(
      new Option('-o, --output <format>', 'Output format: pretty|json|yaml')
        .choices(['pretty', 'json', 'yaml'])
        .default('pretty')
    )
    .addHelpText(
      'after',
      `
Examples:
  $ shep logs view 550e8400-e29b-41d4-a716-446655440000
  $ shep logs view abc123 --output json`
    )
    .action(async (id: string, options: ViewOptions) => {
      const logger = container.resolve<ILogger>('ILogger');
      const repository = container.resolve<ILogRepository>('ILogRepository');

      try {
        logger.debug('Viewing log entry', {
          source: 'cli:logs:view',
          logId: id,
          outputFormat: options.output,
        });

        // Query repository
        const log = await repository.findById(id);

        if (!log) {
          messages.error(`Log entry not found: ${id}`, new Error('NOT_FOUND'));
          process.exitCode = 1;
          return;
        }

        // Format output
        let output: string;
        switch (options.output) {
          case 'json':
            output = JSON.stringify(log, null, 2);
            break;
          case 'yaml':
            output = yaml.stringify(log);
            break;
          case 'pretty':
          default:
            output = formatLogDetail(log);
            break;
        }

        console.log(output);

        logger.debug('Viewed log entry successfully', {
          source: 'cli:logs:view',
          logId: id,
        });
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        logger.error('Failed to view log entry', {
          source: 'cli:logs:view',
          logId: id,
          error: err.message,
          stack: err.stack,
        });
        messages.error('Failed to view log entry', err);
        process.exitCode = 1;
      }
    });
}
