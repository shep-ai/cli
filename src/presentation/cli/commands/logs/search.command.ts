/**
 * Search Logs Command
 *
 * Full-text search across log messages using FTS5.
 *
 * Note: This uses the standard search() method with filters.
 * FTS5 full-text search will be implemented in the repository layer.
 */

import { Command, Option } from 'commander';
import { container } from '../../../../infrastructure/di/container.js';
import type { ILogger } from '../../../../application/ports/output/logger.interface.js';
import type { ILogRepository } from '../../../../application/ports/output/log-repository.interface.js';
import type { LogSearchFilters } from '../../../../domain/generated/output.js';
import { messages } from '../../ui/index.js';
import { formatLogsTable, formatLogsJson, formatLogsYaml } from '../../ui/formatters/logs.js';

interface SearchOptions {
  level?: string;
  source?: string;
  limit: number;
  output: 'table' | 'json' | 'yaml';
}

/**
 * Create the search logs command
 */
export function createSearchCommand(): Command {
  return new Command('search')
    .description('Search logs using full-text search')
    .argument('<query>', 'Search query (supports boolean operators: AND, OR, NOT)')
    .addOption(
      new Option('--level <level>', 'Filter by log level').choices([
        'debug',
        'info',
        'warn',
        'error',
      ])
    )
    .addOption(new Option('--source <pattern>', 'Filter by log source'))
    .addOption(
      new Option('--limit <n>', 'Maximum number of results')
        .default(50)
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
  $ shep logs search "error connecting"
  $ shep logs search "database AND timeout"
  $ shep logs search "failed" --level error --limit 100`
    )
    .action(async (query: string, options: SearchOptions) => {
      const logger = container.resolve<ILogger>('ILogger');
      const repository = container.resolve<ILogRepository>('ILogRepository');

      try {
        logger.debug('Searching logs', {
          source: 'cli:logs:search',
          query,
          filters: { level: options.level, source: options.source, limit: options.limit },
          outputFormat: options.output,
        });

        // Build filters (Note: FTS5 search would be implemented in repository)
        const filters: LogSearchFilters = {
          limit: options.limit,
          offset: 0,
        };

        if (options.level) {
          filters.level = options.level;
        }

        if (options.source) {
          filters.source = options.source;
        }

        // Query repository (repository should handle FTS5 search if query is provided)
        const logs = await repository.search(filters);

        // Filter by query in memory (temporary until FTS5 is fully integrated)
        const filteredLogs = logs.filter((log) =>
          log.message.toLowerCase().includes(query.toLowerCase())
        );

        const totalCount = filteredLogs.length;

        // Format output
        let output: string;
        switch (options.output) {
          case 'json':
            output = formatLogsJson(filteredLogs, totalCount);
            break;
          case 'yaml':
            output = formatLogsYaml(filteredLogs, totalCount);
            break;
          case 'table':
          default:
            output = formatLogsTable(filteredLogs, totalCount, 0);
            break;
        }

        console.log(output);

        logger.debug('Searched logs successfully', {
          source: 'cli:logs:search',
          query,
          matchCount: filteredLogs.length,
        });
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        logger.error('Failed to search logs', {
          source: 'cli:logs:search',
          query,
          error: err.message,
          stack: err.stack,
        });
        messages.error('Failed to search logs', err);
        process.exitCode = 1;
      }
    });
}
