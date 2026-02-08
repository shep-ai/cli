/**
 * Stats Logs Command
 *
 * Display log statistics and breakdown by level.
 */

import { Command, Option } from 'commander';
import { container } from '../../../../infrastructure/di/container.js';
import type { ILogger } from '../../../../application/ports/output/logger.interface.js';
import type { ILogRepository } from '../../../../application/ports/output/log-repository.interface.js';
import { messages, colors } from '../../ui/index.js';
import pc from 'picocolors';
import yaml from 'yaml';

interface StatsOptions {
  output: 'table' | 'json' | 'yaml';
}

interface LogStats {
  total: number;
  byLevel: {
    debug: number;
    info: number;
    warn: number;
    error: number;
  };
}

/**
 * Create the stats logs command
 */
export function createStatsCommand(): Command {
  return new Command('stats')
    .description('Display log statistics')
    .addOption(
      new Option('-o, --output <format>', 'Output format: table|json|yaml')
        .choices(['table', 'json', 'yaml'])
        .default('table')
    )
    .addHelpText(
      'after',
      `
Examples:
  $ shep logs stats                  Show log statistics
  $ shep logs stats --output json    Output as JSON`
    )
    .action(async (options: StatsOptions) => {
      const logger = container.resolve<ILogger>('ILogger');
      const repository = container.resolve<ILogRepository>('ILogRepository');

      try {
        logger.debug('Getting log statistics', {
          source: 'cli:logs:stats',
          outputFormat: options.output,
        });

        // Get counts by level
        const stats: LogStats = {
          total: await repository.count({}),
          byLevel: {
            debug: await repository.count({ level: 'debug' }),
            info: await repository.count({ level: 'info' }),
            warn: await repository.count({ level: 'warn' }),
            error: await repository.count({ level: 'error' }),
          },
        };

        // Format output
        let output: string;
        switch (options.output) {
          case 'json':
            output = JSON.stringify(stats, null, 2);
            break;
          case 'yaml':
            output = yaml.stringify(stats);
            break;
          case 'table':
          default:
            output = formatStatsTable(stats);
            break;
        }

        console.log(output);

        logger.debug('Got log statistics successfully', {
          source: 'cli:logs:stats',
          total: stats.total,
        });
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        logger.error('Failed to get log statistics', {
          source: 'cli:logs:stats',
          error: err.message,
          stack: err.stack,
        });
        messages.error('Failed to get log statistics', err);
        process.exitCode = 1;
      }
    });
}

/**
 * Format stats as a table
 */
function formatStatsTable(stats: LogStats): string {
  const lines: string[] = [];

  lines.push('');
  lines.push(`  ${pc.bold(colors.brand('Log Statistics'))}`);
  lines.push('');
  lines.push(`  ${colors.muted('Total Logs:'.padEnd(15))}${stats.total}`);
  lines.push('');
  lines.push(`  ${pc.bold('By Level:')}`);
  lines.push(`    ${colors.muted('Debug:'.padEnd(15))}${stats.byLevel.debug}`);
  lines.push(`    ${colors.info('Info:'.padEnd(15))}${stats.byLevel.info}`);
  lines.push(`    ${colors.warning('Warn:'.padEnd(15))}${stats.byLevel.warn}`);
  lines.push(`    ${colors.error('Error:'.padEnd(15))}${stats.byLevel.error}`);
  lines.push('');

  return lines.join('\n');
}
