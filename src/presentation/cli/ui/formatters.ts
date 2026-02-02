/**
 * CLI Design System - Text Formatters
 *
 * Text formatting utilities for consistent CLI output styling.
 *
 * @example
 * import { fmt } from './formatters';
 * console.log(fmt.bold('Important'));
 * console.log(fmt.heading('Section Title'));
 */

import pc from 'picocolors';
import { colors } from './colors.js';

/**
 * Text formatting functions
 */
export const fmt = {
  /** Bold text */
  bold: pc.bold,
  /** Dimmed/muted text */
  dim: pc.dim,
  /** Italic text */
  italic: pc.italic,
  /** Underlined text */
  underline: pc.underline,
  /** Inverse (swap foreground/background) */
  inverse: pc.inverse,

  // Semantic formatters

  /** Heading style (bold + brand color) */
  heading: (text: string) => pc.bold(colors.brand(text)),
  /** Code/command style (cyan) */
  code: (text: string) => colors.brand(text),
  /** Label style (bold + muted) */
  label: (text: string) => pc.bold(colors.muted(text)),
  /** Value style (normal) */
  value: (text: string) => text,
  /** Version number style */
  version: (text: string) => colors.muted(`v${text}`),
} as const;

export type Formatters = typeof fmt;
