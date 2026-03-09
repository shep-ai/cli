import type { NextConfig } from 'next';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Provide fallback env vars for standalone dev mode (pnpm dev:web).
 * When run via `shep ui`, these are already set by the CLI's setVersionEnvVars()
 * before Next.js starts, so this returns an empty object.
 */
function loadDevFallbacks(): Record<string, string> {
  if (process.env.NEXT_PUBLIC_SHEP_VERSION) {
    return {};
  }

  try {
    // Web package is at src/presentation/web/, root package.json is 3 levels up
    const rootPkgPath = resolve(import.meta.dirname, '../../../package.json');
    const pkg = JSON.parse(readFileSync(rootPkgPath, 'utf-8')) as Record<string, string>;
    return {
      NEXT_PUBLIC_SHEP_VERSION: pkg.version ?? 'unknown',
      NEXT_PUBLIC_SHEP_PACKAGE_NAME: pkg.name ?? '@shepai/cli',
      NEXT_PUBLIC_SHEP_DESCRIPTION: pkg.description ?? 'Autonomous AI Native SDLC Platform',
    };
  } catch {
    return {
      NEXT_PUBLIC_SHEP_VERSION: 'unknown',
      NEXT_PUBLIC_SHEP_PACKAGE_NAME: '@shepai/cli',
      NEXT_PUBLIC_SHEP_DESCRIPTION: 'Autonomous AI Native SDLC Platform',
    };
  }
}

const nextConfig: NextConfig = {
  // Pin turbopack root to the monorepo root so it doesn't infer a wrong
  // workspace root from unrelated lockfiles higher in the filesystem.
  turbopack: {
    root: resolve(import.meta.dirname, '../../..'),
  },

  // Exclude packages from Turbopack bundling — use Node.js require() instead.
  // @shepai/core: 187 source files; bundling them makes Turbopack recompile
  //   the entire core on every server request. Externalizing it eliminates
  //   ~80-110ms compile overhead per request.
  // tsyringe/reflect-metadata/better-sqlite3: native/DI packages.
  // node:*: prevents Turbopack from statically evaluating platform APIs.
  serverExternalPackages: [
    '@shepai/core',
    'tsyringe',
    'reflect-metadata',
    'better-sqlite3',
    'node:os',
    'node:child_process',
    'node:fs',
  ],

  // Enable typed routes (moved from experimental in Next.js 16)
  typedRoutes: true,

  // Configure the output directory
  distDir: '.next',

  // Inject version info from package.json for the web UI
  env: loadDevFallbacks(),

  // Use standalone output mode in production builds only.
  // Standalone bundles node_modules into .next/ for deployment without pnpm install.
  // Skipped in dev to avoid extra overhead (copying files, larger .next directory).
  ...(process.env.NODE_ENV === 'production' ? { output: 'standalone' as const } : {}),

  // Allow attachment uploads up to 11 MB (10 MB limit + multipart overhead)
  experimental: {
    serverActions: {
      bodySizeLimit: '11mb',
    },
  },
};

export default nextConfig;
