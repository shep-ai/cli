/**
 * Install Command UI Messages
 *
 * Message templates for the tool installation flow.
 * Provides consistent formatting for confirmation prompts,
 * progress indicators, and result messages.
 */

import { colors, fmt, messages } from './index.js';

/** Messages for the install command */
export const installMessages = {
  /** Display tool already available message */
  alreadyInstalled(toolName: string): void {
    messages.success(`${toolName} is already installed`);
  },

  /** Display installation success */
  installSuccess(toolName: string): void {
    messages.success(`${toolName} installed successfully`);
  },

  /** Display installation failure */
  installFailed(toolName: string, errorMessage: string): void {
    messages.error(`Failed to install ${toolName}: ${errorMessage}`, new Error(errorMessage));
  },

  /** Display unknown tool error */
  unknownTool(toolName: string, availableTools: string[]): void {
    messages.error(
      `Unknown tool: "${toolName}". Available: ${availableTools.join(', ')}`,
      new Error(`Unknown tool: ${toolName}`)
    );
  },

  /** Display checking availability message */
  checkingAvailability(toolName: string): void {
    console.log(colors.muted(`Checking if ${toolName} is available...`));
  },

  /** Display starting installation message */
  startingInstall(toolName: string): void {
    console.log(fmt.heading(`Installing ${toolName}`));
    console.log();
  },
};
