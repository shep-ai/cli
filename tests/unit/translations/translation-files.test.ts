import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const TRANSLATIONS_DIR = resolve(import.meta.dirname, '../../../translations/en');

function loadJson(filename: string): Record<string, unknown> {
  const content = readFileSync(resolve(TRANSLATIONS_DIR, filename), 'utf-8');
  return JSON.parse(content);
}

describe('English translation files', () => {
  const namespaces = ['common.json', 'cli.json', 'tui.json', 'web.json'];

  for (const ns of namespaces) {
    it(`${ns} parses as valid JSON`, () => {
      expect(() => loadJson(ns)).not.toThrow();
    });

    it(`${ns} is a non-empty object`, () => {
      const data = loadJson(ns);
      expect(typeof data).toBe('object');
      expect(Object.keys(data).length).toBeGreaterThan(0);
    });
  }

  describe('common.json structure', () => {
    it('contains errors top-level group', () => {
      const data = loadJson('common.json');
      expect(data).toHaveProperty('errors');
      expect(typeof data.errors).toBe('object');
    });

    it('contains labels top-level group', () => {
      const data = loadJson('common.json');
      expect(data).toHaveProperty('labels');
      expect(typeof data.labels).toBe('object');
    });

    it('contains status top-level group', () => {
      const data = loadJson('common.json');
      expect(data).toHaveProperty('status');
      expect(typeof data.status).toBe('object');
    });

    it('contains language names for all supported languages', () => {
      const data = loadJson('common.json') as { language: Record<string, string> };
      const expectedLanguages = ['en', 'ru', 'pt', 'es', 'ar', 'he', 'fr', 'de'];
      for (const lang of expectedLanguages) {
        expect(data.language).toHaveProperty(lang);
      }
    });
  });

  describe('cli.json structure', () => {
    it('contains commands top-level group', () => {
      const data = loadJson('cli.json');
      expect(data).toHaveProperty('commands');
      expect(typeof data.commands).toBe('object');
    });
  });

  describe('tui.json structure', () => {
    it('contains prompts top-level group', () => {
      const data = loadJson('tui.json');
      expect(data).toHaveProperty('prompts');
      expect(typeof data.prompts).toBe('object');
    });
  });

  describe('web.json structure', () => {
    it('contains settings top-level group', () => {
      const data = loadJson('web.json');
      expect(data).toHaveProperty('settings');
      expect(typeof data.settings).toBe('object');
    });

    it('contains navigation top-level group', () => {
      const data = loadJson('web.json');
      expect(data).toHaveProperty('navigation');
      expect(typeof data.navigation).toBe('object');
    });
  });
});
