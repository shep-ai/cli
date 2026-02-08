/**
 * Log Formatting Utilities
 *
 * Provides formatters for displaying logs in various formats.
 */

import type { LogEntry } from '../../../../domain/generated/output.js';
import { colors } from '../colors.js';
import pc from 'picocolors';
import yaml from 'yaml';

/**
 * Format logs as a clean table
 */
export function formatLogsTable(logs: LogEntry[], totalCount: number, offset: number): string {
  if (logs.length === 0) {
    return `\n  ${colors.muted('No logs found')}\n`;
  }

  const lines: string[] = [];

  // Header
  lines.push('');
  lines.push(
    `  ${pc.bold(colors.brand(`Logs (showing ${logs.length} of ${totalCount})`))}${offset > 0 ? colors.muted(` [offset: ${offset}]`) : ''}`
  );
  lines.push('');

  // Table
  for (const log of logs) {
    const timestamp = new Date(log.createdAt).toLocaleString();
    const levelColor = getLevelColor(log.level);
    const levelBadge = levelColor(log.level.toUpperCase().padEnd(5));

    lines.push(`  ${colors.muted(timestamp)}  ${levelBadge}  ${colors.muted(log.source)}`);
    lines.push(`    ${log.message}`);

    // Show context if present and not empty
    if (log.context && Object.keys(log.context).length > 0) {
      lines.push(`    ${colors.muted(JSON.stringify(log.context))}`);
    }

    // Show stack trace preview if present
    if (log.stackTrace) {
      const firstLine = log.stackTrace.split('\n')[0];
      lines.push(`    ${colors.error(firstLine)}`);
    }

    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Format logs as JSON
 */
export function formatLogsJson(logs: LogEntry[], totalCount: number): string {
  return JSON.stringify({ logs, totalCount }, null, 2);
}

/**
 * Format logs as YAML
 */
export function formatLogsYaml(logs: LogEntry[], totalCount: number): string {
  return yaml.stringify({ logs, totalCount });
}

/**
 * Format a single log entry for detailed view
 */
export function formatLogDetail(log: LogEntry): string {
  const lines: string[] = [];

  lines.push('');
  lines.push(`  ${pc.bold(colors.brand('Log Entry'))}`);
  lines.push('');

  // ID
  lines.push(`  ${colors.muted('ID:'.padEnd(15))}${log.id}`);

  // Timestamp
  const timestamp = new Date(log.createdAt).toLocaleString();
  lines.push(`  ${colors.muted('Timestamp:'.padEnd(15))}${timestamp}`);

  // Level
  const levelColor = getLevelColor(log.level);
  lines.push(`  ${colors.muted('Level:'.padEnd(15))}${levelColor(log.level.toUpperCase())}`);

  // Source
  lines.push(`  ${colors.muted('Source:'.padEnd(15))}${log.source}`);

  // Message
  lines.push('');
  lines.push(`  ${pc.bold('Message:')}`);
  lines.push(`    ${log.message}`);

  // Context
  if (log.context && Object.keys(log.context).length > 0) {
    lines.push('');
    lines.push(`  ${pc.bold('Context:')}`);
    const contextYaml = yaml.stringify(log.context, { indent: 4 });
    lines.push(
      contextYaml
        .split('\n')
        .map((line: string) => `    ${line}`)
        .join('\n')
    );
  }

  // Stack trace
  if (log.stackTrace) {
    lines.push('');
    lines.push(`  ${pc.bold(colors.error('Stack Trace:'))}`);
    lines.push(
      log.stackTrace
        .split('\n')
        .map((line) => `    ${colors.error(line)}`)
        .join('\n')
    );
  }

  lines.push('');

  return lines.join('\n');
}

/**
 * Get color function for log level
 */
function getLevelColor(level: string): (text: string) => string {
  switch (level.toLowerCase()) {
    case 'debug':
      return colors.muted;
    case 'info':
      return colors.info;
    case 'warn':
      return colors.warning;
    case 'error':
      return colors.error;
    default:
      return (text: string) => text;
  }
}
