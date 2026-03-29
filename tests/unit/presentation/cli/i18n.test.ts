import { describe, it, expect, beforeEach } from 'vitest';
import i18next from 'i18next';

// Reset i18next state before each test so init() can be called fresh.
beforeEach(() => {
  // i18next is a singleton — we need to reset its initialized state
  // between tests to avoid "already initialized" issues.
  if (i18next.isInitialized) {
    // Use internal method to reset if available, otherwise re-initialize will just change language
  }
});

async function initCliI18n(language: string) {
  // Dynamically import to get fresh module evaluation context
  const { initI18n } = await import('@/presentation/cli/i18n.js');
  return initI18n(language);
}

describe('CLI i18n initialization', () => {
  it('initI18n("en") initializes successfully', async () => {
    const instance = await initCliI18n('en');
    expect(instance.isInitialized).toBe(true);
    expect(instance.language).toBe('en');
  });

  it('t("errors.notFound") returns English string from common namespace', async () => {
    const instance = await initCliI18n('en');
    const result = instance.t('errors.notFound', { ns: 'common' });
    expect(result).toBe('Not found');
  });

  it('t() with default namespace resolves common keys', async () => {
    const instance = await initCliI18n('en');
    // common is the default namespace
    const result = instance.t('errors.unknown');
    expect(result).toBe('An unknown error occurred');
  });

  it('t() resolves CLI namespace keys', async () => {
    const instance = await initCliI18n('en');
    const result = instance.t('commands.settings.description', { ns: 'cli' });
    expect(result).toBe('Configure Shep settings');
  });

  it('t() for missing key falls back to English', async () => {
    // Even with a non-existent locale, fallback to English should work
    const instance = await initCliI18n('nonexistent');
    const result = instance.t('errors.notFound', { ns: 'common' });
    expect(result).toBe('Not found');
  });

  it('fallback language is English', async () => {
    const instance = await initCliI18n('en');
    expect(instance.options.fallbackLng).toContain('en');
  });

  it('loads both common and cli namespaces', async () => {
    const instance = await initCliI18n('en');
    expect(instance.hasResourceBundle('en', 'common')).toBe(true);
    expect(instance.hasResourceBundle('en', 'cli')).toBe(true);
  });

  it('supports interpolation', async () => {
    const instance = await initCliI18n('en');
    const result = instance.t('errors.failedToLoad', {
      ns: 'common',
      resource: 'settings',
    });
    expect(result).toBe('Failed to load settings');
  });
});
