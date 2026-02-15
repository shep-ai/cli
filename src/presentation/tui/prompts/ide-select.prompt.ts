/**
 * IDE Select Prompt Configuration
 *
 * Configuration for the @inquirer/select prompt that lets users
 * choose their preferred IDE/editor.
 */

import { EditorType } from '../../../domain/generated/output.js';
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
        value: EditorType.VsCode,
        description: 'Visual Studio Code',
      },
      {
        name: 'Cursor',
        value: EditorType.Cursor,
        description: 'Cursor AI editor',
      },
      {
        name: 'Windsurf',
        value: EditorType.Windsurf,
        description: 'Windsurf editor',
      },
      {
        name: 'Zed',
        value: EditorType.Zed,
        description: 'Zed editor',
      },
      {
        name: 'Antigravity',
        value: EditorType.Antigravity,
        description: 'Google Antigravity IDE',
      },
    ],
    theme: shepTheme,
  } as const;
}
