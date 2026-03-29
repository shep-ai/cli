import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { useTranslation } from 'react-i18next';
import webI18n from '@/lib/i18n';
import { I18nProvider } from '@/components/providers/i18n-provider';

describe('Web i18n module', () => {
  it('initializes with language "en"', () => {
    expect(webI18n.isInitialized).toBe(true);
    expect(webI18n.language).toBe('en');
  });

  it('resolves common namespace keys', () => {
    const result = webI18n.t('errors.notFound', { ns: 'common' });
    expect(result).toBe('Not found');
  });

  it('resolves web namespace keys', () => {
    const result = webI18n.t('settings.language.title', { ns: 'web' });
    expect(result).toBe('Language');
  });

  it('has common and web resource bundles', () => {
    expect(webI18n.hasResourceBundle('en', 'common')).toBe(true);
    expect(webI18n.hasResourceBundle('en', 'web')).toBe(true);
  });

  it('fallback language is English', () => {
    expect(webI18n.options.fallbackLng).toContain('en');
  });
});

describe('I18nProvider', () => {
  function TranslatedComponent() {
    const { t } = useTranslation('web');
    return <span data-testid="translated">{t('settings.language.title')}</span>;
  }

  it('renders children and provides translation context', () => {
    render(
      <I18nProvider initialLanguage="en">
        <TranslatedComponent />
      </I18nProvider>
    );

    const element = screen.getByTestId('translated');
    expect(element).toHaveTextContent('Language');
  });

  it('useTranslation() returns expected translations inside provider', () => {
    function StatusComponent() {
      const { t } = useTranslation('common');
      return <span data-testid="status">{t('status.success')}</span>;
    }

    render(
      <I18nProvider initialLanguage="en">
        <StatusComponent />
      </I18nProvider>
    );

    expect(screen.getByTestId('status')).toHaveTextContent('Success');
  });
});
