/**
 * Application Output Ports Module
 *
 * Exports repository interfaces (output ports) for the Application layer.
 * Infrastructure layer provides concrete implementations.
 */

export type { ISettingsRepository } from './settings.repository.interface.js';
export type { IAgentValidator, AgentValidationResult } from './agent-validator.interface.js';
export type { IVersionService } from './version-service.interface.js';
