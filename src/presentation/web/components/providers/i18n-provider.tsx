'use client';

import { useEffect } from 'react';
import { I18nextProvider } from 'react-i18next';
import webI18n from '@/lib/i18n';
import { applyRtlFont } from '@/lib/rtl-fonts';

interface I18nProviderProps {
  initialLanguage: string;
  children: React.ReactNode;
}

/**
 * Client-side i18n provider that wraps the application with react-i18next.
 *
 * Receives the initial language from the server-side layout and sets it
 * on the i18next instance. Language changes at runtime (e.g. from settings)
 * call i18n.changeLanguage() which re-renders all translated components.
 *
 * Also handles lazy-loading RTL fonts (Noto Sans Arabic/Hebrew) when the
 * active language requires them.
 */
export function I18nProvider({ initialLanguage, children }: I18nProviderProps) {
  useEffect(() => {
    if (webI18n.language !== initialLanguage) {
      webI18n.changeLanguage(initialLanguage);
    }
    // Apply RTL font for the initial language (lazy-loads if needed)
    applyRtlFont(initialLanguage);
  }, [initialLanguage]);

  // Listen for runtime language changes and apply/remove RTL fonts
  useEffect(() => {
    function onLanguageChanged(lng: string) {
      applyRtlFont(lng);
    }
    webI18n.on('languageChanged', onLanguageChanged);
    return () => {
      webI18n.off('languageChanged', onLanguageChanged);
    };
  }, []);

  return <I18nextProvider i18n={webI18n}>{children}</I18nextProvider>;
}
