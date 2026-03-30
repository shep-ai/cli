/**
 * IDE Select Prompt Configuration
 *
 * Configuration for the @inquirer/select prompt that lets users
 * choose their preferred IDE/editor. Choices are derived dynamically
 * from JSON tool metadata (any tool with openDirectory).
 */

import { getIdeEntries } from '@/infrastructure/services/tool-installer/tool-metadata.js';
import { getTuiI18n } from '../i18n.js';
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
    message: getTuiI18n().t('tui:prompts.selectIde.message'),
    choices,
    theme: shepTheme,
  };
}
