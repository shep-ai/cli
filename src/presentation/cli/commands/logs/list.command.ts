/**
 * List Logs Command
 *
 * Display recent logs in table format with filtering and pagination.
 */

import { Command, Option } from 'commander';
import { container } from '../../../../infrastructure/di/container.js';
import type { ILogger } from '../../../../application/ports/output/logger.interface.js';
import type { ILogRepository } from '../../../../application/ports/output/log-repository.interface.js';
import type { LogSearchFilters } from '../../../../domain/generated/output.js';
import { messages } from '../../ui/index.js';
import { formatLogsTable, formatLogsJson, formatLogsYaml } from '../../ui/formatters/logs.js';

interface ListOptions {
  level?: string;
  source?: string;
  limit: number;
  offset: number;
  output: 'table' | 'json' | 'yaml';
}

/**
 * Create the list logs command
 */
export function createListCommand(): Command {
  return new Command('list')
    .description('Display recent logs')
    .addOption(
      new Option('--level <level>', 'Filter by log level').choices([
        'debug',
        'info',
        'warn',
        'error',
      ])
    )
    .addOption(new Option('--source <pattern>', 'Filter by log source (exact match)'))
    .addOption(
      new Option('--limit <n>', 'Maximum number of logs to display')
        .default(50)
        .argParser((val) => parseInt(val, 10))
    )
    .addOption(
      new Option('--offset <n>', 'Number of logs to skip (pagination)')
        .default(0)
        .argParser((val) => parseInt(val, 10))
    )
    .addOption(
      new Option('-o, --output <format>', 'Output format: table|json|yaml')
        .choices(['table', 'json', 'yaml'])
        .default('table')
    )
    .addHelpText(
      'after',
      `
Examples:
  $ shep logs list                         Display recent logs
  $ shep logs list --level error           Show only error logs
  $ shep logs list --source cli:settings   Filter by source
  $ shep logs list --limit 100             Show 100 logs`
    )
    .action(async (options: ListOptions) => {
      const logger = container.resolve<ILogger>('ILogger');
      const repository = container.resolve<ILogRepository>('ILogRepository');

      try {
        logger.debug('Listing logs', {
          source: 'cli:logs:list',
          filters: {
            level: options.level,
            source: options.source,
            limit: options.limit,
            offset: options.offset,
          },
          outputFormat: options.output,
        });

        // Build filters
        const filters: LogSearchFilters = {
          limit: options.limit,
          offset: options.offset,
        };

        if (options.level) {
          filters.level = options.level;
        }

        if (options.source) {
          filters.source = options.source;
        }

        // Query repository
        const logs = await repository.search(filters);
        const totalCount = await repository.count(filters);

        // Format output
        let output: string;
        switch (options.output) {
          case 'json':
            output = formatLogsJson(logs, totalCount);
            break;
          case 'yaml':
            output = formatLogsYaml(logs, totalCount);
            break;
          case 'table':
          default:
            output = formatLogsTable(logs, totalCount, options.offset);
            break;
        }

        console.log(output);

        logger.debug('Listed logs successfully', {
          source: 'cli:logs:list',
          count: logs.length,
          totalCount,
        });
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        logger.error('Failed to list logs', {
          source: 'cli:logs:list',
          error: err.message,
          stack: err.stack,
        });
        messages.error('Failed to list logs', err);
        process.exitCode = 1;
      }
    });
}
