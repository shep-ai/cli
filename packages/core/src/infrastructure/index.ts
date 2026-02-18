/**
 * @shepai/core Infrastructure Layer
 *
 * Exports DI container, repositories, and services.
 */

// DI container
export { initializeContainer, isContainerInitialized, container } from './di/container.js';

// Settings service
export { getSettings, initializeSettings } from './services/settings.service.js';
