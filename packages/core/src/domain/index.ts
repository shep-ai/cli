/**
 * @shepai/core Domain Layer
 *
 * Exports all domain types, factories, and value objects.
 */

// Generated types from TypeSpec
export * from './generated/output';

// Factories
export { createDefaultSettings } from './factories/settings-defaults.factory';

// Value objects
export type { VersionInfo } from './value-objects/version-info';
export { DEFAULT_VERSION_INFO } from './value-objects/version-info';
