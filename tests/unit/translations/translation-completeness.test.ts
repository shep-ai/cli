import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { Language } from '@shepai/core/domain/generated/output.js';

const TRANSLATIONS_DIR = resolve(import.meta.dirname, '../../../translations');
const NAMESPACES = ['common', 'cli', 'tui', 'web'] as const;

/**
 * Recursively extract all leaf-key paths from a nested JSON object.
 * Returns dot-separated paths (e.g. "settings.language.title").
 */
function getLeafKeys(obj: Record<string, unknown>, prefix = ''): string[] {
  const keys: string[] = [];
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      keys.push(...getLeafKeys(value as Record<string, unknown>, fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  return keys.sort();
}

function loadJson(locale: string, ns: string): Record<string, unknown> {
  const filePath = resolve(TRANSLATIONS_DIR, locale, `${ns}.json`);
  const content = readFileSync(filePath, 'utf-8');
  return JSON.parse(content);
}

function getLeafValues(
  obj: Record<string, unknown>,
  prefix = ''
): { key: string; value: unknown }[] {
  const entries: { key: string; value: unknown }[] = [];
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      entries.push(...getLeafValues(value as Record<string, unknown>, fullKey));
    } else {
      entries.push({ key: fullKey, value });
    }
  }
  return entries;
}

const ALL_LOCALES = Object.values(Language);
const NON_ENGLISH_LOCALES = ALL_LOCALES.filter((l) => l !== 'en');

describe('translation completeness', () => {
  describe('directory and file coverage', () => {
    it('has a translations directory for every Language enum value', () => {
      for (const locale of ALL_LOCALES) {
        const dir = resolve(TRANSLATIONS_DIR, locale);
        expect(existsSync(dir), `Missing translations directory: ${locale}/`).toBe(true);
      }
    });

    it('has all 4 namespace files for every locale', () => {
      for (const locale of ALL_LOCALES) {
        for (const ns of NAMESPACES) {
          const filePath = resolve(TRANSLATIONS_DIR, locale, `${ns}.json`);
          expect(existsSync(filePath), `Missing file: ${locale}/${ns}.json`).toBe(true);
        }
      }
    });

    it('contains no unexpected locale directories', () => {
      const dirs = readdirSync(TRANSLATIONS_DIR, { withFileTypes: true })
        .filter((d) => d.isDirectory())
        .map((d) => d.name);
      for (const dir of dirs) {
        expect(ALL_LOCALES).toContain(dir);
      }
    });
  });

  describe('valid JSON', () => {
    for (const locale of ALL_LOCALES) {
      for (const ns of NAMESPACES) {
        it(`${locale}/${ns}.json parses as valid JSON`, () => {
          expect(() => loadJson(locale, ns)).not.toThrow();
        });
      }
    }
  });

  describe('key parity with English', () => {
    for (const ns of NAMESPACES) {
      const enKeys = getLeafKeys(loadJson('en', ns));

      for (const locale of NON_ENGLISH_LOCALES) {
        it(`${locale}/${ns}.json has the same keys as en/${ns}.json`, () => {
          const localeKeys = getLeafKeys(loadJson(locale, ns));

          const missingInLocale = enKeys.filter((k) => !localeKeys.includes(k));
          const extraInLocale = localeKeys.filter((k) => !enKeys.includes(k));

          expect(missingInLocale, `Keys missing in ${locale}/${ns}.json`).toEqual([]);
          expect(extraInLocale, `Extra keys in ${locale}/${ns}.json`).toEqual([]);
        });
      }
    }
  });

  describe('no empty string values', () => {
    for (const locale of ALL_LOCALES) {
      for (const ns of NAMESPACES) {
        it(`${locale}/${ns}.json has no empty string values`, () => {
          const entries = getLeafValues(loadJson(locale, ns));
          const empties = entries
            .filter((e) => typeof e.value === 'string' && e.value.trim() === '')
            .map((e) => e.key);

          expect(empties, `Empty values in ${locale}/${ns}.json`).toEqual([]);
        });
      }
    }
  });

  describe('interpolation variables preserved', () => {
    for (const ns of NAMESPACES) {
      const enEntries = getLeafValues(loadJson('en', ns));
      const enEntriesWithVars = enEntries.filter(
        (e) => typeof e.value === 'string' && /\{\{[^}]+\}\}/.test(e.value)
      );

      for (const locale of NON_ENGLISH_LOCALES) {
        if (enEntriesWithVars.length === 0) continue;

        it(`${locale}/${ns}.json preserves all {{variables}} from English`, () => {
          const localeData = loadJson(locale, ns);
          const localeEntries = getLeafValues(localeData);
          const localeMap = new Map(localeEntries.map((e) => [e.key, e.value]));

          const mismatches: string[] = [];
          for (const enEntry of enEntriesWithVars) {
            const enVars = (enEntry.value as string).match(/\{\{[^}]+\}\}/g) ?? [];
            const localeValue = localeMap.get(enEntry.key);
            if (typeof localeValue !== 'string') continue;
            const localeVars = localeValue.match(/\{\{[^}]+\}\}/g) ?? [];

            const enVarsSorted = [...enVars].sort();
            const localeVarsSorted = [...localeVars].sort();
            if (JSON.stringify(enVarsSorted) !== JSON.stringify(localeVarsSorted)) {
              mismatches.push(
                `${enEntry.key}: expected ${JSON.stringify(enVarsSorted)}, got ${JSON.stringify(localeVarsSorted)}`
              );
            }
          }

          expect(mismatches, `Variable mismatches in ${locale}/${ns}.json`).toEqual([]);
        });
      }
    }
  });
});
