/**
 * Shep TUI Theme
 *
 * Custom theme for @inquirer/prompts that matches the Shep CLI design system.
 * Uses picocolors for consistent styling with the rest of the CLI.
 */

import pc from 'picocolors';

/**
 * Shep-branded theme for @inquirer/prompts.
 *
 * Customizes the prefix icon to use the Shep brand color (cyan)
 * and provides consistent styling across all TUI prompts.
 */
export const shepTheme = {
  prefix: {
    idle: pc.cyan('?'),
    done: pc.green('\u2714'),
  },
  style: {
    highlight: pc.cyan,
    answer: pc.cyan,
  },
} as const;
