/**
 * Version Information Helpers
 *
 * Provides version and system info for the Web UI.
 * Reads from NEXT_PUBLIC_SHEP_* environment variables which are set by:
 * 1. The CLI (`shep ui`) via setVersionEnvVars() before starting Next.js
 * 2. next.config.ts dev fallback for standalone `pnpm dev:web` mode
 *
 * The VersionInfo shape mirrors src/domain/value-objects/version-info.ts
 * from the CLI domain layer.
 */

/** Version information for the package (mirrors domain VersionInfo) */
export interface VersionInfo {
  version: string;
  name: string;
  description: string;
}

/** System runtime information */
export interface SystemInfo {
  nodeVersion: string;
  platform: string;
  arch: string;
}

/**
 * Get version info from environment variables.
 * Falls back to defaults if not set.
 */
export function getVersionInfo(): VersionInfo {
  return {
    version: process.env.NEXT_PUBLIC_SHEP_VERSION ?? 'unknown',
    name: process.env.NEXT_PUBLIC_SHEP_PACKAGE_NAME ?? '@shepai/cli',
    description: process.env.NEXT_PUBLIC_SHEP_DESCRIPTION ?? 'Autonomous AI Native SDLC Platform',
  };
}

/**
 * Get system runtime information.
 * Must be called from a server context (Server Component or API route).
 */
export function getSystemInfo(): SystemInfo {
  return {
    nodeVersion: process.version,
    platform: process.platform,
    arch: process.arch,
  };
}
