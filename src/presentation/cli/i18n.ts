/**
 * CLI i18n initialization module.
 *
 * Configures i18next for the CLI presentation layer using the
 * common and cli namespaces. Translation files are loaded from
 * the shared translations/ directory at the project root.
 */

import i18next from 'i18next';
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
  // Fallback — will fail gracefully when files are not found
  return candidates[0];
}

function loadNamespace(
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

function buildResources(
  translationsDir: string,
  language: string
): Record<string, Record<string, Record<string, unknown>>> {
  const resources: Record<string, Record<string, Record<string, unknown>>> = {};
  const locales =
    language === FALLBACK_LANGUAGE ? [FALLBACK_LANGUAGE] : [language, FALLBACK_LANGUAGE];

  for (const locale of locales) {
    resources[locale] = {};
    for (const ns of NAMESPACES) {
      resources[locale][ns] = loadNamespace(translationsDir, locale, ns);
    }
  }

  return resources;
}

/**
 * Initialize i18next for the CLI layer.
 *
 * @param language - BCP-47 language code (e.g. 'en', 'ru', 'ar')
 * @returns The initialized i18next instance
 */
export async function initI18n(language: string): Promise<typeof i18next> {
  const translationsDir = getTranslationsDir();
  const resources = buildResources(translationsDir, language);

  await i18next.init({
    lng: language,
    fallbackLng: FALLBACK_LANGUAGE,
    defaultNS: 'common',
    ns: [...NAMESPACES],
    resources,
    interpolation: {
      escapeValue: false, // CLI output is not HTML
    },
  });

  return i18next;
}

export { i18next };
