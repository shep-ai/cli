/**
 * Version Service
 *
 * Infrastructure service that reads version information from package.json.
 * Follows Clean Architecture: Infrastructure layer implements data access.
 */

import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { DEFAULT_VERSION_INFO } from '../../domain/value-objects/version-info.js';
import type { VersionInfo } from '../../domain/value-objects/version-info.js';

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
export class VersionService {
  private readonly versionInfo: VersionInfo;

  constructor() {
    this.versionInfo = this.loadVersionInfo();
  }

  private loadVersionInfo(): VersionInfo {
    try {
      const __dirname = dirname(fileURLToPath(import.meta.url));
      const packageJsonPath = findPackageJson(__dirname);

      if (!packageJsonPath) {
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
        return {
          version: (parsed as Record<string, string>).version,
          name: (parsed as Record<string, string>).name,
          description: (parsed as Record<string, string>).description,
        };
      }

      return DEFAULT_VERSION_INFO;
    } catch {
      // If anything goes wrong, return defaults to keep CLI functional
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
 */
export function setVersionEnvVars(info: VersionInfo): void {
  process.env.NEXT_PUBLIC_SHEP_VERSION = info.version;
  process.env.NEXT_PUBLIC_SHEP_PACKAGE_NAME = info.name;
  process.env.NEXT_PUBLIC_SHEP_DESCRIPTION = info.description;
}
