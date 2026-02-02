/**
 * Version Service
 *
 * Infrastructure service that reads version information from package.json.
 * Follows Clean Architecture: Infrastructure layer implements data access.
 */

import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export interface VersionInfo {
  /** Package version (e.g., "0.1.0") */
  version: string;
  /** Package name (e.g., "@shepai/cli") */
  name: string;
  /** Package description */
  description: string;
}

/** Default version info when package.json cannot be read */
const DEFAULT_VERSION_INFO: VersionInfo = {
  version: 'unknown',
  name: '@shepai/cli',
  description: 'Autonomous AI Native SDLC Platform',
};

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
