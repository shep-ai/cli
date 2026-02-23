/**
 * CLI Design System - Message Components
 *
 * Pre-styled message output functions for consistent CLI feedback.
 *
 * @example
 * import { messages } from './messages';
 * messages.success('Repository initialized');
 * messages.error('Failed to connect', new Error('timeout'));
 */

import { colors } from './colors.js';
import { symbols } from './symbols.js';

/**
 * Message output functions
 */
export const messages = {
  /**
   * Print success message
   * @example messages.success('Operation completed')
   * // Output: ✓ Operation completed
   */
  success: (text: string): void => {
    console.log(colors.success(`${symbols.success} ${text}`));
  },

  /**
   * Print error message
   * @param text - Error message
   * @param error - Optional error object with details
   * @example messages.error('Connection failed')
   * // Output: ✗ Connection failed
   */
  error: (text: string, error?: Error): void => {
    console.error(colors.error(`${symbols.error} ${text}`));
    if (error) {
      console.error(colors.muted(error.stack ?? error.message));
    }
  },

  /**
   * Print warning message
   * @example messages.warning('Config file not found, using defaults')
   * // Output: ⚠ Config file not found, using defaults
   */
  warning: (text: string): void => {
    console.log(colors.warning(`${symbols.warning} ${text}`));
  },

  /**
   * Print info message
   * @example messages.info('Analyzing repository...')
   * // Output: ℹ Analyzing repository...
   */
  info: (text: string): void => {
    console.log(colors.info(`${symbols.info} ${text}`));
  },

  /**
   * Print debug message (only when DEBUG env var is set)
   * @example messages.debug('Cache hit: features.json')
   * // Output: › Cache hit: features.json (only in debug mode)
   */
  debug: (text: string): void => {
    if (process.env.DEBUG) {
      console.log(colors.muted(`${symbols.pointer} ${text}`));
    }
  },

  /**
   * Print a blank line
   */
  newline: (): void => {
    console.log();
  },

  /**
   * Print raw text without formatting
   */
  log: (text: string): void => {
    console.log(text);
  },
} as const;

export type Messages = typeof messages;
