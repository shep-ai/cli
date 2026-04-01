/**
 * CLI i18n initialization module.
 *
 * Configures i18next for the CLI presentation layer using the
 * common and cli namespaces. Translation files are loaded from
 * the shared translations/ directory at the project root.
 */

import i18next, { type i18n } from 'i18next';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const NAMESPACES = ['common', 'cli'] as const;
const FALLBACK_LANGUAGE = 'en';

/**
 * Resolve the translations directory. In development this is at the
 * project root; in production (dist/) it is resolved relative to this
 * file's location.
 */
function getTranslationsDir(): string {
  const thisDir = dirname(fileURLToPath(import.meta.url));
  // Walk up from src/presentation/cli/ (or dist/src/presentation/cli/)
  // to reach the project root where translations/ lives.
  const candidates = [
    resolve(thisDir, '../../../translations'),
    resolve(thisDir, '../../../../translations'),
  ];
  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return candidate;
    }
  }
  return candidates[0];
}

/**
 * Load a single namespace JSON file for a given locale.
 * Returns an empty object if the file does not exist or cannot be parsed.
 */
export function loadNamespace(
  translationsDir: string,
  locale: string,
  ns: string
): Record<string, unknown> {
  const filePath = resolve(translationsDir, locale, `${ns}.json`);
  try {
    const content = readFileSync(filePath, 'utf-8');
    return JSON.parse(content) as Record<string, unknown>;
  } catch {
    return {};
  }
}

/**
 * Build i18next resources object by loading namespace files from disk.
 */
export function buildResources(
  translationsDir: string,
  language: string,
  namespaces: readonly string[]
): Record<string, Record<string, Record<string, unknown>>> {
  const resources: Record<string, Record<string, Record<string, unknown>>> = {};
  const locales =
    language === FALLBACK_LANGUAGE ? [FALLBACK_LANGUAGE] : [language, FALLBACK_LANGUAGE];

  for (const locale of locales) {
    resources[locale] = {};
    for (const ns of namespaces) {
      resources[locale][ns] = loadNamespace(translationsDir, locale, ns);
    }
  }

  return resources;
}

/** Module-level CLI i18next instance. */
let cliI18n: i18n | undefined;

/**
 * Initialize i18next for the CLI layer.
 *
 * Creates a dedicated i18next instance (via createInstance) to avoid
 * conflicts with other presentation layers sharing the same process.
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
      escapeValue: false, // CLI output is not HTML
    },
  });

  cliI18n = instance;
  return instance;
}

/**
 * Get the initialized CLI i18next instance.
 * Throws if initI18n() has not been called.
 */
export function getCliI18n(): i18n {
  if (!cliI18n) {
    throw new Error('CLI i18n not initialized. Call initI18n() first.');
  }
  return cliI18n;
}

export { FALLBACK_LANGUAGE, getTranslationsDir };
