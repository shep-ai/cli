/**
 * Web UI i18n configuration.
 *
 * Initializes i18next with react-i18next for the web presentation layer.
 * Uses the common and web namespaces. English translations are bundled
 * inline; other languages will be loaded on demand in a future phase.
 */

import i18next, { type i18n } from 'i18next';
import { initReactI18next } from 'react-i18next';

// Import English translations inline — they are always needed as fallback
import commonEn from '../../../../translations/en/common.json';
import webEn from '../../../../translations/en/web.json';

const FALLBACK_LANGUAGE = 'en';
const NAMESPACES = ['common', 'web'] as const;

/**
 * Create and configure the web i18next instance.
 *
 * Returns a singleton instance — multiple calls return the same object.
 * Use `changeLanguage()` on the returned instance to switch locales at runtime.
 */
function createI18nInstance(): i18n {
  const instance = i18next.createInstance();

  instance.use(initReactI18next).init({
    lng: FALLBACK_LANGUAGE,
    fallbackLng: FALLBACK_LANGUAGE,
    defaultNS: 'common',
    ns: [...NAMESPACES],
    resources: {
      en: {
        common: commonEn,
        web: webEn,
      },
    },
    interpolation: {
      escapeValue: false, // React already escapes output
    },
    react: {
      useSuspense: false, // Avoid suspense boundaries for i18n
    },
  });

  return instance;
}

/** Singleton web i18next instance. */
const webI18n: i18n = createI18nInstance();

export default webI18n;
export { FALLBACK_LANGUAGE, NAMESPACES };
