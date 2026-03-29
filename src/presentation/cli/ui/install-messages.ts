/**
 * Install Command UI Messages
 *
 * Message templates for the tool installation flow.
 * Provides consistent formatting for confirmation prompts,
 * progress indicators, and result messages.
 */

import { colors, fmt, messages } from './index.js';
import { getCliI18n } from '../i18n.js';

/** Messages for the install command */
export const installMessages = {
  /** Display tool already available message */
  alreadyInstalled(toolName: string): void {
    const t = getCliI18n().t;
    messages.success(t('cli:ui.installMessages.alreadyInstalled', { tool: toolName }));
  },

  /** Display installation success */
  installSuccess(toolName: string): void {
    const t = getCliI18n().t;
    messages.success(t('cli:ui.installMessages.installSuccess', { tool: toolName }));
  },

  /** Display installation failure */
  installFailed(toolName: string, errorMessage: string): void {
    const t = getCliI18n().t;
    messages.error(
      t('cli:ui.installMessages.installFailed', { tool: toolName, error: errorMessage }),
      new Error(errorMessage)
    );
  },

  /** Display unknown tool error */
  unknownTool(toolName: string, availableTools: string[]): void {
    const t = getCliI18n().t;
    messages.error(
      t('cli:ui.installMessages.unknownTool', {
        tool: toolName,
        available: availableTools.join(', '),
      }),
      new Error(`Unknown tool: ${toolName}`)
    );
  },

  /** Display checking availability message */
  checkingAvailability(toolName: string): void {
    const t = getCliI18n().t;
    console.log(colors.muted(t('cli:ui.installMessages.checkingAvailability', { tool: toolName })));
  },

  /** Display starting installation message */
  startingInstall(toolName: string): void {
    const t = getCliI18n().t;
    console.log(fmt.heading(t('cli:ui.installMessages.installingHeading', { tool: toolName })));
    console.log();
  },
};
