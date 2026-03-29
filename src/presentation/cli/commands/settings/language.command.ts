/**
 * Language Configuration Command
 *
 * Configures the display language used by the Shep CLI and Web UI.
 *
 * Usage:
 *   shep settings language   # Interactive language picker
 */

import { Command } from 'commander';
import { select } from '@inquirer/prompts';
import { container } from '@/infrastructure/di/container.js';
import { UpdateSettingsUseCase } from '@/application/use-cases/settings/update-settings.use-case.js';
import {
  getSettings,
  resetSettings,
  initializeSettings,
} from '@/infrastructure/services/settings.service.js';
import { Language } from '@/domain/generated/output.js';
import { messages } from '../../ui/index.js';
import { getCliI18n } from '../../i18n.js';
import { shepTheme } from '../../../tui/themes/shep.theme.js';

/**
 * Language options with native display names.
 * Native names are used so users can identify their language
 * regardless of the current UI language.
 */
const LANGUAGE_OPTIONS = [
  { value: Language.English, name: 'English' },
  { value: Language.Russian, name: 'Русский' },
  { value: Language.Portuguese, name: 'Português' },
  { value: Language.Spanish, name: 'Español' },
  { value: Language.Arabic, name: 'العربية' },
  { value: Language.Hebrew, name: 'עברית' },
  { value: Language.French, name: 'Français' },
  { value: Language.German, name: 'Deutsch' },
];

/**
 * Create the language configuration command.
 */
export function createLanguageCommand(): Command {
  const t = getCliI18n().t;

  return new Command('language')
    .description(t('cli:commands.settings.language.description'))
    .addHelpText(
      'after',
      `
Examples:
  $ shep settings language   Interactive language picker`
    )
    .action(async () => {
      try {
        const settings = getSettings();
        const currentLanguage = settings.user?.preferredLanguage ?? Language.English;

        const selectedLanguage = await select<string>({
          message: t('cli:commands.settings.language.selectPrompt'),
          choices: LANGUAGE_OPTIONS.map((opt) => ({
            name: opt.name,
            value: opt.value,
          })),
          default: currentLanguage,
          theme: shepTheme,
        });

        // Persist via UpdateSettingsUseCase
        settings.user = {
          ...settings.user,
          preferredLanguage: selectedLanguage as Language,
        };
        const useCase = container.resolve(UpdateSettingsUseCase);
        const updatedSettings = await useCase.execute(settings);

        // Refresh in-memory singleton
        resetSettings();
        initializeSettings(updatedSettings);

        const displayName =
          LANGUAGE_OPTIONS.find((opt) => opt.value === selectedLanguage)?.name ?? selectedLanguage;
        messages.success(t('cli:commands.settings.language.success', { language: displayName }));
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));

        if (err.message.includes('force closed') || err.message.includes('User force closed')) {
          messages.info(t('cli:commands.settings.language.cancelled'));
          return;
        }

        messages.error(t('cli:commands.settings.language.failed'), err);
        process.exitCode = 1;
      }
    });
}
