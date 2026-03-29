/**
 * Server-side language preference utilities for the Web UI.
 *
 * Reads the language preference from the Settings singleton
 * and determines the text direction (LTR/RTL).
 */

import { hasSettings, getSettings } from '@shepai/core/infrastructure/services/settings.service';
import { Language } from '@shepai/core/domain/generated/output';

const RTL_LANGUAGES: ReadonlySet<string> = new Set([Language.Arabic, Language.Hebrew]);
const DEFAULT_LANGUAGE = Language.English;

/**
 * Check whether a language code requires right-to-left text direction.
 */
export function isRtlLanguage(language: string): boolean {
  return RTL_LANGUAGES.has(language);
}

interface LanguagePreference {
  language: string;
  dir: 'ltr' | 'rtl';
}

/**
 * Get the user's language preference and computed text direction.
 *
 * Reads from the Settings singleton (better-sqlite3, synchronous).
 * Falls back to English if settings are not available (e.g. during build).
 */
export function getLanguagePreference(): LanguagePreference {
  let language = DEFAULT_LANGUAGE as string;

  try {
    if (hasSettings()) {
      language = getSettings().user.preferredLanguage ?? DEFAULT_LANGUAGE;
    }
  } catch {
    // Settings not initialized (build, SSG, or first run)
  }

  return {
    language,
    dir: isRtlLanguage(language) ? 'rtl' : 'ltr',
  };
}
