/**
 * Version Service
 *
 * Infrastructure service that reads version information from package.json.
 * Follows Clean Architecture: Infrastructure layer implements data access.
 */

import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { injectable, inject } from 'tsyringe';

import { DEFAULT_VERSION_INFO } from '../../domain/value-objects/version-info.js';
import type { VersionInfo } from '../../domain/value-objects/version-info.js';
import type { ILogger } from '../../application/ports/output/logger.interface.js';

// Re-export for backward compatibility
export type { VersionInfo } from '../../domain/value-objects/version-info.js';

/**
 * Find package.json by traversing up from a starting directory.
 * Works in both development (src/) and production (dist/) environments.
 */
function findPackageJson(startDir: string): string | null {
  let currentDir = startDir;

  // Traverse up to find package.json (max 5 levels to avoid infinite loops)
  for (let i = 0; i < 5; i++) {
    const pkgPath = join(currentDir, 'package.json');
    if (existsSync(pkgPath)) {
      return pkgPath;
    }
    const parentDir = dirname(currentDir);
    if (parentDir === currentDir) break; // Reached filesystem root
    currentDir = parentDir;
  }

  return null;
}

/**
 * Service for reading version information from package.json
 */
@injectable()
export class VersionService {
  private readonly versionInfo: VersionInfo;
  private readonly logger: ILogger;

  constructor(@inject('ILogger') logger: ILogger) {
    this.logger = logger;
    this.versionInfo = this.loadVersionInfo();
  }

  private loadVersionInfo(): VersionInfo {
    try {
      const __dirname = dirname(fileURLToPath(import.meta.url));
      const packageJsonPath = findPackageJson(__dirname);

      if (!packageJsonPath) {
        this.logger.warn('package.json not found, using default version info');
        return DEFAULT_VERSION_INFO;
      }

      const content = readFileSync(packageJsonPath, 'utf-8');
      const parsed: unknown = JSON.parse(content);

      // Validate parsed JSON has required fields
      if (
        typeof parsed === 'object' &&
        parsed !== null &&
        'version' in parsed &&
        'name' in parsed &&
        'description' in parsed &&
        typeof (parsed as Record<string, unknown>).version === 'string' &&
        typeof (parsed as Record<string, unknown>).name === 'string' &&
        typeof (parsed as Record<string, unknown>).description === 'string'
      ) {
        const versionInfo = {
          version: (parsed as Record<string, string>).version,
          name: (parsed as Record<string, string>).name,
          description: (parsed as Record<string, string>).description,
        };
        this.logger.debug('Loaded version info from package.json', { versionInfo });
        return versionInfo;
      }

      this.logger.warn('Invalid package.json format, using default version info');
      return DEFAULT_VERSION_INFO;
    } catch (error) {
      // If anything goes wrong, return defaults to keep CLI functional
      this.logger.error('Failed to load version info', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return DEFAULT_VERSION_INFO;
    }
  }

  /**
   * Get version information
   */
  getVersion(): VersionInfo {
    return this.versionInfo;
  }
}

/**
 * Set version info as NEXT_PUBLIC environment variables.
 * Must be called BEFORE starting the Next.js web server
 * so the values are available to the web UI.
 *
 * Uses dynamic property access to prevent webpack/SWC from inlining
 * these at build time (we need runtime assignment, not build-time replacement).
 */
export function setVersionEnvVars(info: VersionInfo): void {
  // Guard against webpack static analysis issues
  if (typeof process === 'undefined' || !process.env) return;

  // Use computed properties that webpack can't statically analyze
  const envVars: Record<string, string> = {
    [`NEXT_${'PUBLIC'}_SHEP_VERSION`]: info.version,
    [`NEXT_${'PUBLIC'}_SHEP_PACKAGE_NAME`]: info.name,
    [`NEXT_${'PUBLIC'}_SHEP_DESCRIPTION`]: info.description,
  };

  // Set each env var dynamically to prevent build-time inlining
  for (const [key, value] of Object.entries(envVars)) {
    process.env[key] = value;
  }
}
