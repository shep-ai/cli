/* global console, process */
/**
 * Build script for Electron main process.
 *
 * Bundles the Electron source code AND @shepai/core source into dist/.
 * Third-party packages (next, better-sqlite3, tsyringe, etc.) are
 * externalized — they're resolved at runtime from node_modules.
 *
 * This approach is needed because @shepai/core exports raw .ts files
 * that can't be consumed at runtime without a TypeScript compiler.
 */

import { build } from 'esbuild';
import { copyFileSync, existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const monorepoRoot = path.resolve(root, '../..');
const coreDir = path.join(root, '..', 'core', 'src');

/**
 * Collect all third-party dependencies that should be external.
 * These come from the root package.json dependencies (where next,
 * better-sqlite3, tsyringe etc. live) and the electron package.json.
 */
function collectExternalDeps() {
  const externals = new Set(['electron']);

  // Root package.json dependencies
  const rootPkg = JSON.parse(readFileSync(path.join(monorepoRoot, 'package.json'), 'utf8'));
  for (const dep of Object.keys(rootPkg.dependencies || {})) {
    externals.add(dep);
  }

  // Electron package.json dependencies (runtime)
  const electronPkg = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'));
  for (const dep of Object.keys(electronPkg.dependencies || {})) {
    if (dep !== '@shepai/core') externals.add(dep);
  }
  for (const dep of Object.keys(electronPkg.devDependencies || {})) {
    externals.add(dep);
  }

  // Core package.json dependencies
  const corePkg = JSON.parse(readFileSync(path.join(root, '..', 'core', 'package.json'), 'utf8'));
  for (const dep of Object.keys(corePkg.dependencies || {})) {
    externals.add(dep);
  }

  return [...externals];
}

async function main() {
  const distDir = path.join(root, 'dist');
  const externals = collectExternalDeps();

  console.log(`Externalizing ${externals.length} packages`);

  // Build main process entry point
  // Bundles: electron src + @shepai/core src (TypeScript → JS)
  // External: all node_modules packages (resolved at runtime)
  await build({
    entryPoints: [path.join(root, 'src/main.ts')],
    bundle: true,
    platform: 'node',
    target: 'node22',
    format: 'esm',
    outdir: distDir,
    external: externals,
    sourcemap: true,
    alias: {
      '@shepai/core': coreDir,
    },
    resolveExtensions: ['.ts', '.js', '.mjs', '.json'],
    banner: {
      js: '// Built by esbuild for Electron main process',
    },
    logLevel: 'info',
  });

  // Build preload script separately (runs in isolated renderer context)
  // Electron 28+ supports ESM preload scripts with contextIsolation: true
  await build({
    entryPoints: [path.join(root, 'src/preload.ts')],
    bundle: true,
    platform: 'node',
    target: 'node22',
    format: 'esm',
    outdir: distDir,
    external: ['electron'],
    sourcemap: true,
    logLevel: 'info',
  });

  // Copy splash.html to dist/
  const splashSrc = path.join(root, 'src', 'splash.html');
  const splashDst = path.join(distDir, 'splash.html');
  if (existsSync(splashSrc)) {
    copyFileSync(splashSrc, splashDst);
    console.log('Copied splash.html to dist/');
  }

  console.log('Electron build complete.');
}

main().catch((err) => {
  console.error('Build failed:', err);
  process.exit(1);
});
