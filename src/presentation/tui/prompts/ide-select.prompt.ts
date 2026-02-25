/**
 * IDE Select Prompt Configuration
 *
 * Configuration for the @inquirer/select prompt that lets users
 * choose their preferred IDE/editor. Choices are derived dynamically
 * from JSON tool metadata (any tool with openDirectory).
 */

import { getIdeEntries } from '@/infrastructure/services/tool-installer/tool-metadata.js';
import { shepTheme } from '../themes/shep.theme.js';

/**
 * Creates the @inquirer/select configuration for selecting a preferred IDE.
 */
export function createIdeSelectConfig() {
  const choices = getIdeEntries().map(([id, meta]) => ({
    name: meta.name,
    value: id,
    description: meta.summary,
  }));

  return {
    message: 'Select your preferred IDE',
    choices,
    theme: shepTheme,
  };
}
