/**
 * Smoke Tests — Web Package Import Resolution
 *
 * Verifies that all @shepai/core imports used by the web package resolve correctly.
 * These tests catch misconfigurations in package.json exports, tsconfig paths,
 * and Vite/Turbopack alias mappings before they break the dev server.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve, join } from 'node:path';

/** Recursively collect all .ts files under a directory. */
function collectTsFiles(dir: string): string[] {
  const results: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      results.push(...collectTsFiles(full));
    } else if (full.endsWith('.ts')) {
      results.push(full);
    }
  }
  return results;
}

describe('smoke: @shepai/core import resolution', () => {
  it('resolves @shepai/core/domain/generated types', async () => {
    const mod = await import('@shepai/core/domain/generated');
    expect(mod.SdlcLifecycle).toBeDefined();
    expect(mod.TaskState).toBeDefined();
  });

  it('resolves @shepai/core/domain barrel export', async () => {
    const mod = await import('@shepai/core/domain');
    expect(mod.SdlcLifecycle).toBeDefined();
    expect(mod.TaskState).toBeDefined();
    expect(mod.createDefaultSettings).toBeDefined();
  });
});

describe('smoke: web component imports', () => {
  it('resolves derive-feature-state module', async () => {
    const mod = await import('@/components/common/feature-node/derive-feature-state');
    expect(typeof mod.deriveNodeState).toBe('function');
    expect(typeof mod.deriveProgress).toBe('function');
  });

  it('resolves use-cases bridge module', async () => {
    const mod = await import('@shepai/core/infrastructure/di/use-cases-bridge');
    expect(typeof mod.getFeatures).toBe('function');
    expect(typeof mod.getAgentRun).toBe('function');
  });
});

describe('smoke: no .js imports in @shepai/core domain source', () => {
  /**
   * Turbopack consumes @shepai/core as raw TypeScript source (not compiled).
   * Relative imports with .js extensions (e.g. './output.js') fail because
   * Turbopack doesn't perform .js → .ts extension mapping.
   *
   * This test scans packages/core/src/domain/ — the subtree the web package
   * imports from — and asserts no relative import uses a .js extension.
   */
  it('packages/core/src/domain/ files must not use .js extensions in relative imports', () => {
    const domainDir = resolve(__dirname, '../../../../packages/core/src/domain');
    const files = collectTsFiles(domainDir);

    // Match: from './something.js' or from "../something.js"
    const jsImportRegex = /from\s+['"]\..*\.js['"]/g;

    const violations: string[] = [];

    for (const file of files) {
      const content = readFileSync(file, 'utf-8');
      const matches = content.match(jsImportRegex);
      if (matches) {
        const relative = file.replace(`${domainDir}/`, '');
        for (const m of matches) {
          violations.push(`${relative}: ${m}`);
        }
      }
    }

    expect(
      violations,
      `Relative imports in packages/core/src/domain/ must not use .js extensions — ` +
        `Turbopack consumes these as raw .ts source and cannot resolve .js.\n` +
        `Violations:\n${violations.join('\n')}`
    ).toEqual([]);
  });
});
