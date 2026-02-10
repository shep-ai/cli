/**
 * Service Port Interfaces
 *
 * Abstractions for external services implemented by infrastructure.
 */

export type { IVersionService } from './version-service.interface.js';
export type { IWebServerService } from './web-server-service.interface.js';

// Sub-domain service ports
export * from './agents/index.js';
export * from './memory/index.js';
