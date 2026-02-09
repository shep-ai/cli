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
  // Empty turbopack config to silence dev server warning
  // Production builds use --webpack flag explicitly (see package.json)
  turbopack: {},

  // Enable typed routes (moved from experimental in Next.js 16)
  typedRoutes: true,

  // Configure the output directory
  distDir: '.next',

  // Inject version info from package.json for the web UI
  env: loadDevFallbacks(),

  // Mark native modules as external (server-side only, not bundled)
  // Let webpack bundle the TypeScript infrastructure code and handle .js extensions
  serverExternalPackages: ['better-sqlite3'],

  // Configure webpack to resolve .js imports to .ts files (for Node.js ESM compatibility)
  webpack: (config, { isServer }) => {
    // Add .js extension resolution to find .ts files
    config.resolve.extensionAlias = {
      '.js': ['.ts', '.tsx', '.js', '.jsx'],
      '.mjs': ['.mts', '.mjs'],
      '.cjs': ['.cts', '.cjs'],
    };

    // Externalize Node.js built-in modules for server builds
    if (isServer) {
      const builtins = [
        'fs',
        'path',
        'crypto',
        'stream',
        'util',
        'events',
        'buffer',
        'querystring',
        'url',
        'string_decoder',
        'punycode',
        'http',
        'https',
        'os',
        'assert',
        'constants',
        'timers',
        'console',
        'vm',
        'zlib',
        'tty',
        'domain',
      ];

      const existingExternals = config.externals ?? [];
      config.externals = [
        ...(Array.isArray(existingExternals) ? existingExternals : [existingExternals]),
        ...builtins.map((mod) => ({ [mod]: `commonjs ${mod}` })),
      ];
    }

    return config;
  },
};

export default nextConfig;
