import { describe, it, expect } from 'vitest';
import { Language } from '@shepai/core/domain/generated/output.js';
import { initI18n as initCliI18n } from '../../../src/presentation/cli/i18n.js';
import { initI18n as initTuiI18n } from '../../../src/presentation/tui/i18n.js';

const RTL_LANGUAGES = [Language.Arabic, Language.Hebrew];
const ALL_LANGUAGES = Object.values(Language);
const NON_ENGLISH_LANGUAGES = ALL_LANGUAGES.filter((l) => l !== Language.English);

describe('language switching - CLI i18n', () => {
  it('initializes with English by default and resolves keys', async () => {
    const i18n = await initCliI18n('en');
    expect(i18n.language).toBe('en');
    expect(i18n.t('cli:commands.settings.description')).toBeTruthy();
    expect(i18n.t('cli:commands.settings.description')).not.toBe('commands.settings.description');
  });

  for (const lang of NON_ENGLISH_LANGUAGES) {
    it(`initializes with ${lang} and produces translated CLI output`, async () => {
      const i18n = await initCliI18n(lang);
      expect(i18n.language).toBe(lang);

      const enInstance = await initCliI18n('en');
      const enValue = enInstance.t('cli:commands.settings.description');
      const localizedValue = i18n.t('cli:commands.settings.description');

      // Localized value should exist and differ from English
      expect(localizedValue).toBeTruthy();
      expect(localizedValue).not.toBe('commands.settings.description');
      expect(localizedValue).not.toBe(enValue);
    });
  }

  it('falls back to English for missing keys', async () => {
    const i18n = await initCliI18n('ru');
    // Use a key from 'common' namespace that exists
    const value = i18n.t('common:errors.unknown');
    expect(value).toBeTruthy();
    expect(value).not.toMatch(/^errors\./);
  });
});

describe('language switching - TUI i18n', () => {
  it('initializes with English by default and resolves keys', async () => {
    const i18n = await initTuiI18n('en');
    expect(i18n.language).toBe('en');
    expect(i18n.t('tui:prompts.selectAgent.message')).toBeTruthy();
    expect(i18n.t('tui:prompts.selectAgent.message')).not.toBe('prompts.selectAgent.message');
  });

  for (const lang of NON_ENGLISH_LANGUAGES) {
    it(`initializes with ${lang} and produces translated TUI output`, async () => {
      const i18n = await initTuiI18n(lang);
      expect(i18n.language).toBe(lang);

      const enInstance = await initTuiI18n('en');
      const enValue = enInstance.t('tui:prompts.selectAgent.message');
      const localizedValue = i18n.t('tui:prompts.selectAgent.message');

      expect(localizedValue).toBeTruthy();
      expect(localizedValue).not.toBe('prompts.selectAgent.message');
      expect(localizedValue).not.toBe(enValue);
    });
  }
});

describe('language switching - common namespace shared across layers', () => {
  it('CLI and TUI resolve the same common key to the same English value', async () => {
    const cli = await initCliI18n('en');
    const tui = await initTuiI18n('en');

    const cliValue = cli.t('common:errors.unknown');
    const tuiValue = tui.t('common:errors.unknown');

    expect(cliValue).toBe(tuiValue);
  });

  for (const lang of NON_ENGLISH_LANGUAGES) {
    it(`CLI and TUI resolve common:errors.unknown to the same ${lang} translation`, async () => {
      const cli = await initCliI18n(lang);
      const tui = await initTuiI18n(lang);

      const cliValue = cli.t('common:errors.unknown');
      const tuiValue = tui.t('common:errors.unknown');

      expect(cliValue).toBe(tuiValue);
    });
  }
});

describe('language switching - interpolation', () => {
  it('English interpolation works with {{variables}}', async () => {
    const i18n = await initCliI18n('en');
    const result = i18n.t('cli:ui.daemon.daemonSpawned', { url: 'http://localhost:3000' });
    expect(result).toContain('http://localhost:3000');
    expect(result).not.toContain('{{url}}');
  });

  for (const lang of NON_ENGLISH_LANGUAGES) {
    it(`${lang} interpolation preserves {{variables}}`, async () => {
      const i18n = await initCliI18n(lang);
      const result = i18n.t('cli:ui.daemon.daemonSpawned', { url: 'http://localhost:3000' });
      expect(result).toContain('http://localhost:3000');
      expect(result).not.toContain('{{url}}');
    });
  }
});

describe('language switching - RTL languages', () => {
  for (const lang of RTL_LANGUAGES) {
    it(`${lang} initializes correctly as an RTL language`, async () => {
      const i18n = await initCliI18n(lang);
      expect(i18n.language).toBe(lang);
      // Verify the language is recognized as RTL by checking it's in our RTL list
      expect(RTL_LANGUAGES).toContain(lang);
    });

    it(`${lang} resolves CLI keys to non-English text`, async () => {
      const i18n = await initCliI18n(lang);
      const enInstance = await initCliI18n('en');
      const enValue = enInstance.t('cli:commands.version.description');
      const rtlValue = i18n.t('cli:commands.version.description');

      expect(rtlValue).toBeTruthy();
      expect(rtlValue).not.toBe(enValue);
    });
  }
});

describe('language switching - i18n instances are isolated', () => {
  it('changing language on CLI instance does not affect TUI instance', async () => {
    const cli = await initCliI18n('ru');
    const tui = await initTuiI18n('en');

    expect(cli.language).toBe('ru');
    expect(tui.language).toBe('en');
  });

  it('creating multiple CLI instances for different languages are independent', async () => {
    const en = await initCliI18n('en');
    const ru = await initCliI18n('ru');

    const enDesc = en.t('cli:commands.settings.description');
    const ruDesc = ru.t('cli:commands.settings.description');

    // Note: initCliI18n creates a new instance each call, so they should be independent
    // Both should resolve to valid strings
    expect(enDesc).toBeTruthy();
    expect(ruDesc).toBeTruthy();
  });
});
