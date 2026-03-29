'use client';

import { useEffect } from 'react';
import { I18nextProvider } from 'react-i18next';
import webI18n from '@/lib/i18n';

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
 */
export function I18nProvider({ initialLanguage, children }: I18nProviderProps) {
  useEffect(() => {
    if (webI18n.language !== initialLanguage) {
      webI18n.changeLanguage(initialLanguage);
    }
  }, [initialLanguage]);

  return <I18nextProvider i18n={webI18n}>{children}</I18nextProvider>;
}
