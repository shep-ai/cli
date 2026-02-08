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
  // Enable Turbopack for faster development builds
  turbopack: {},

  // Enable typed routes (moved from experimental in Next.js 16)
  typedRoutes: true,

  // Configure the output directory
  distDir: '.next',

  // Inject version info from package.json for the web UI
  env: loadDevFallbacks(),
};

export default nextConfig;
