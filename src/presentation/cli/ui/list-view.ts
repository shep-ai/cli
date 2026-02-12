/**
 * CLI Design System - List View
 *
 * Renders clean, borderless columnar tables for "ls" commands.
 * Muted column headers, aligned values, no ASCII grid lines.
 *
 * @example
 * renderListView({
 *   title: 'Agent Runs',
 *   columns: [
 *     { label: 'ID', width: 10 },
 *     { label: 'Status', width: 14 },
 *   ],
 *   rows: [['9144a138', colors.info('running')]],
 * });
 */

import { colors } from './colors.js';
import { fmt } from './formatters.js';
import { messages } from './messages.js';

export interface ListColumn {
  label: string;
  width: number;
}

export interface ListViewConfig {
  title: string;
  columns: ListColumn[];
  rows: string[][];
  emptyMessage?: string;
}

/**
 * Render a list view to stdout.
 *
 * Columns are padded to their declared width (ANSI-aware).
 * The last column is never padded so long values don't waste space.
 */
export function renderListView(config: ListViewConfig): void {
  if (config.rows.length === 0) {
    messages.newline();
    messages.info(config.emptyMessage ?? 'No items found');
    messages.newline();
    return;
  }

  const lines: string[] = [];

  lines.push('');
  lines.push(`  ${fmt.heading(`${config.title} (${config.rows.length})`)}`);
  lines.push('');

  // Header
  const header = config.columns.map((col) => colors.muted(col.label.padEnd(col.width))).join('  ');
  lines.push(`  ${header}`);

  // Data rows
  for (const row of config.rows) {
    const cells = row.map((cell, i) => {
      // Don't pad the last column
      if (i === row.length - 1) return cell;
      const width = config.columns[i]?.width ?? 10;
      return ansiPad(cell, width);
    });
    lines.push(`  ${cells.join('  ')}`);
  }

  lines.push('');
  console.log(lines.join('\n'));
}

/** Pad a string that may contain ANSI escape codes to a visible width. */
function ansiPad(text: string, width: number): string {
  const visible = stripAnsi(text).length;
  if (visible >= width) return text;
  return text + ' '.repeat(width - visible);
}

/** Strip ANSI escape sequences to get visible character count. */
function stripAnsi(text: string): string {
  // eslint-disable-next-line no-control-regex
  return text.replace(/\x1B\[[0-9;]*m/g, '');
}
