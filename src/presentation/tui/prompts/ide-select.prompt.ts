/**
 * IDE Select Prompt Configuration
 *
 * Configuration for the @inquirer/select prompt that lets users
 * choose their preferred IDE/editor.
 */

import { shepTheme } from '../themes/shep.theme.js';

/**
 * Creates the @inquirer/select configuration for selecting a preferred IDE.
 */
export function createIdeSelectConfig() {
  return {
    message: 'Select your preferred IDE',
    choices: [
      {
        name: 'VS Code',
        value: 'vscode',
        description: 'Visual Studio Code',
      },
      {
        name: 'Cursor',
        value: 'cursor',
        description: 'Cursor AI editor',
      },
      {
        name: 'Windsurf',
        value: 'windsurf',
        description: 'Windsurf editor',
      },
      {
        name: 'Zed',
        value: 'zed',
        description: 'Zed editor',
      },
    ],
    theme: shepTheme,
  } as const;
}
