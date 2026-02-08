/**
 * Build Integrity E2E Tests
 *
 * Verifies the compiled dist/ output works correctly with plain Node.js
 * (without tsx or tsconfig-paths). Catches issues like unresolved path
 * aliases (@/) that work in dev but break in production.
 */

import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createCliRunner } from '../../helpers/cli/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, '../../..');
const DIST_DIR = resolve(PROJECT_ROOT, 'dist');

/** Runner that executes the compiled dist/ binary with node (not tsx) */
const dist = createCliRunner({}, true);

describe('CLI: build integrity', () => {
  describe('dist/ runs without path alias errors', () => {
    it('should run version command from compiled output', () => {
      const result = dist.run('version');

      expect(
        result.success,
        `Command failed.\nstdout: ${result.stdout}\nstderr: ${result.stderr}`
      ).toBe(true);
      expect(result.stdout).toContain('@shepai/cli');
      expect(result.stderr).not.toContain('ERR_MODULE_NOT_FOUND');
    });

    it('should run help command from compiled output', () => {
      const result = dist.run('--help');

      expect(
        result.success,
        `Command failed.\nstdout: ${result.stdout}\nstderr: ${result.stderr}`
      ).toBe(true);
      expect(result.stdout).toContain('shep');
    });

    it('should not crash with module resolution errors', () => {
      // settings show exercises deeper code paths including DI and repositories
      const result = dist.run('settings show --output json');

      // The command may fail if settings aren't initialized, but it should
      // never fail due to unresolved path aliases or missing modules
      expect(result.stderr).not.toContain('ERR_MODULE_NOT_FOUND');
      expect(result.stderr).not.toContain('Cannot find package');
      expect(result.stderr).not.toContain("Cannot find module '@/");
    });
  });

  describe('dist/ has no unresolved path aliases', () => {
    it('should not contain @/ imports in compiled JavaScript files', () => {
      const unresolvedImports = findUnresolvedAliases(DIST_DIR, '.js');

      if (unresolvedImports.length > 0) {
        const details = unresolvedImports
          .map((m) => `  ${m.file}:${m.line}: ${m.content}`)
          .join('\n');
        expect.fail(
          `Found ${unresolvedImports.length} unresolved @/ path alias import(s) in dist/:\n${details}`
        );
      }
    });

    it('should not contain @/ imports in declaration files', () => {
      const unresolvedImports = findUnresolvedAliases(DIST_DIR, '.d.ts');

      if (unresolvedImports.length > 0) {
        const details = unresolvedImports
          .map((m) => `  ${m.file}:${m.line}: ${m.content}`)
          .join('\n');
        expect.fail(
          `Found ${unresolvedImports.length} unresolved @/ path alias import(s) in dist/:\n${details}`
        );
      }
    });
  });
});

/** Match actual import/export statements with @/ aliases (not JSDoc comments) */
const UNRESOLVED_ALIAS_PATTERN = /(?:^|\s)(?:import|export)\s.*from\s+['"]@\//;

interface UnresolvedImport {
  file: string;
  line: number;
  content: string;
}

/** Recursively scan directory for files with unresolved @/ imports */
function findUnresolvedAliases(dir: string, ext: string): UnresolvedImport[] {
  const results: UnresolvedImport[] = [];
  scanDir(dir, ext, results);
  return results;
}

function scanDir(dir: string, ext: string, results: UnresolvedImport[]): void {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      scanDir(fullPath, ext, results);
    } else if (entry.name.endsWith(ext)) {
      const content = readFileSync(fullPath, 'utf-8');
      const lines = content.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (UNRESOLVED_ALIAS_PATTERN.test(lines[i])) {
          results.push({
            file: fullPath.replace(`${DIST_DIR}/`, ''),
            line: i + 1,
            content: lines[i].trim(),
          });
        }
      }
    }
  }
}
