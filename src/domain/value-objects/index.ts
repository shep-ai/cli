/**
 * Re-export shim — domain value objects have moved to @shepai/core
 */
export type { VersionInfo } from '../../../packages/core/src/domain/value-objects/version-info.js';
export { DEFAULT_VERSION_INFO } from '../../../packages/core/src/domain/value-objects/version-info.js';
export type { ToolInstallationStatus } from './tool-installation-status.js';
export {
  createToolInstallationStatus,
  createAvailableStatus,
  createMissingStatus,
  createErrorStatus,
} from './tool-installation-status.js';
