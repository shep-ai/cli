/**
 * CLI Design System - Colors
 *
 * Centralized color palette for consistent terminal output.
 * Uses picocolors for fast, lightweight ANSI color support.
 *
 * Respects NO_COLOR environment variable automatically.
 *
 * @example
 * import { colors } from './colors';
 * console.log(colors.success('Operation completed'));
 */

import pc from 'picocolors';

/**
 * Semantic color palette for CLI output
 */
export const colors = {
  // Brand colors
  /** Primary brand color (cyan) */
  brand: pc.cyan,

  // Semantic colors
  /** Success state (green) */
  success: pc.green,
  /** Error state (red) */
  error: pc.red,
  /** Warning state (yellow) */
  warning: pc.yellow,
  /** Info state (blue) */
  info: pc.blue,

  // Text modifiers
  /** Muted/secondary text (gray) */
  muted: pc.gray,
  /** Highlighted/accent text (magenta) */
  accent: pc.magenta,
} as const;

export type Colors = typeof colors;
