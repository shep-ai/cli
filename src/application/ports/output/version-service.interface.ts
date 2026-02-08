/**
 * Version Service Interface
 *
 * Output port for reading package version information.
 * Infrastructure layer provides concrete implementation.
 *
 * Following Clean Architecture:
 * - Domain and Application layers depend on this interface
 * - Infrastructure layer provides concrete implementations
 */

import type { VersionInfo } from '../../../domain/value-objects/version-info.js';

/**
 * Port interface for reading version information.
 *
 * Implementations must:
 * - Read version info from the package manifest (package.json)
 * - Return sensible defaults when the manifest cannot be read
 */
export interface IVersionService {
  /**
   * Get version information for the package.
   *
   * @returns Version info with name, version, and description
   */
  getVersion(): VersionInfo;
}
