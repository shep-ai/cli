import { describe, it, expect } from 'vitest';
import { initI18n } from '@/presentation/cli/i18n.js';

describe('CLI i18n initialization', () => {
  it('initI18n("en") initializes successfully', async () => {
    const instance = await initI18n('en');
    expect(instance.isInitialized).toBe(true);
    expect(instance.language).toBe('en');
  });

  it('t("errors.notFound") returns English string from common namespace', async () => {
    const instance = await initI18n('en');
    const result = instance.t('errors.notFound', { ns: 'common' });
    expect(result).toBe('Not found');
  });

  it('t() with default namespace resolves common keys', async () => {
    const instance = await initI18n('en');
    const result = instance.t('errors.unknown');
    expect(result).toBe('An unknown error occurred');
  });

  it('t() resolves CLI namespace keys', async () => {
    const instance = await initI18n('en');
    const result = instance.t('commands.settings.description', { ns: 'cli' });
    expect(result).toBe('Manage Shep global settings');
  });

  it('t() for missing key falls back to English', async () => {
    const instance = await initI18n('nonexistent');
    const result = instance.t('errors.notFound', { ns: 'common' });
    expect(result).toBe('Not found');
  });

  it('fallback language is English', async () => {
    const instance = await initI18n('en');
    expect(instance.options.fallbackLng).toContain('en');
  });

  it('loads both common and cli namespaces', async () => {
    const instance = await initI18n('en');
    expect(instance.hasResourceBundle('en', 'common')).toBe(true);
    expect(instance.hasResourceBundle('en', 'cli')).toBe(true);
  });

  it('supports interpolation', async () => {
    const instance = await initI18n('en');
    const result = instance.t('errors.failedToLoad', {
      ns: 'common',
      resource: 'settings',
    });
    expect(result).toBe('Failed to load settings');
  });
});
