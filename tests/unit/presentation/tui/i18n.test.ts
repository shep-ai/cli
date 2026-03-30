import { describe, it, expect } from 'vitest';
import { initI18n } from '@/presentation/tui/i18n.js';

describe('TUI i18n initialization', () => {
  it('initI18n("en") initializes successfully for TUI', async () => {
    const instance = await initI18n('en');
    expect(instance.isInitialized).toBe(true);
    expect(instance.language).toBe('en');
  });

  it('t() resolves TUI namespace keys', async () => {
    const instance = await initI18n('en');
    const result = instance.t('prompts.selectAgent.message', { ns: 'tui' });
    expect(result).toBe('Select your AI coding agent');
  });

  it('t() resolves common namespace keys', async () => {
    const instance = await initI18n('en');
    const result = instance.t('errors.notFound', { ns: 'common' });
    expect(result).toBe('Not found');
  });

  it('loads both common and tui namespaces', async () => {
    const instance = await initI18n('en');
    expect(instance.hasResourceBundle('en', 'common')).toBe(true);
    expect(instance.hasResourceBundle('en', 'tui')).toBe(true);
  });

  it('does not load cli namespace', async () => {
    const instance = await initI18n('en');
    expect(instance.hasResourceBundle('en', 'cli')).toBe(false);
  });

  it('creates independent instance from CLI', async () => {
    const { initI18n: initCliI18n } = await import('@/presentation/cli/i18n.js');
    const cliInstance = await initCliI18n('en');
    const tuiInstance = await initI18n('en');

    // They should be distinct instances
    expect(cliInstance).not.toBe(tuiInstance);

    // CLI has cli namespace, TUI has tui namespace
    expect(cliInstance.hasResourceBundle('en', 'cli')).toBe(true);
    expect(cliInstance.hasResourceBundle('en', 'tui')).toBe(false);
    expect(tuiInstance.hasResourceBundle('en', 'tui')).toBe(true);
    expect(tuiInstance.hasResourceBundle('en', 'cli')).toBe(false);
  });
});
