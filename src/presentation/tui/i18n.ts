/**
 * TUI i18n initialization module.
 *
 * Configures i18next for the TUI presentation layer using the
 * common and tui namespaces. Shares the same translation file
 * loading infrastructure as the CLI module.
 */

import i18next, { type i18n } from 'i18next';
import { FALLBACK_LANGUAGE, getTranslationsDir, buildResources } from '@/presentation/cli/i18n.js';

const NAMESPACES = ['common', 'tui'] as const;

/** Module-level TUI i18next instance. */
let tuiI18n: i18n | undefined;

/**
 * Initialize i18next for the TUI layer.
 *
 * Creates a dedicated i18next instance (via createInstance) to avoid
 * conflicts with the CLI instance in the same process.
 *
 * @param language - BCP-47 language code (e.g. 'en', 'ru', 'ar')
 * @returns The initialized i18next instance
 */
export async function initI18n(language: string): Promise<i18n> {
  const translationsDir = getTranslationsDir();
  const resources = buildResources(translationsDir, language, NAMESPACES);

  const instance = i18next.createInstance();
  await instance.init({
    lng: language,
    fallbackLng: FALLBACK_LANGUAGE,
    defaultNS: 'common',
    ns: [...NAMESPACES],
    resources,
    interpolation: {
      escapeValue: false,
    },
  });

  tuiI18n = instance;
  return instance;
}

/**
 * Get the initialized TUI i18next instance.
 * Throws if initI18n() has not been called.
 */
export function getTuiI18n(): i18n {
  if (!tuiI18n) {
    throw new Error('TUI i18n not initialized. Call initI18n() first.');
  }
  return tuiI18n;
}
