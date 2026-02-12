/**
 * CLI Design System
 *
 * Unified design system for consistent terminal output.
 * All CLI commands should use these utilities for visual consistency.
 *
 * @example
 * import { colors, symbols, fmt, messages } from '@/presentation/cli/ui';
 *
 * messages.success('Repository initialized');
 * console.log(fmt.heading('Shep AI CLI'));
 * console.log(`${colors.muted('Version:')} ${fmt.version('0.1.0')}`);
 */

export { colors, type Colors } from './colors.js';
export { symbols, type Symbols } from './symbols.js';
export { fmt, type Formatters } from './formatters.js';
export { messages, type Messages } from './messages.js';
export { TableFormatter, type DatabaseMeta } from './tables.js';
export { OutputFormatter, type OutputFormat } from './output.js';
export {
  renderDetailView,
  type DetailViewConfig,
  type DetailSection,
  type DetailField,
  type DetailTextBlock,
} from './detail-view.js';
export { renderListView, type ListViewConfig, type ListColumn } from './list-view.js';
