/**
 * Agent Validator Interface
 *
 * Output port for checking AI agent tool availability.
 * Infrastructure layer provides concrete implementations.
 *
 * Following Clean Architecture:
 * - Domain and Application layers depend on this interface
 * - Infrastructure layer provides concrete implementations
 */

import type { AgentType } from '../../../domain/generated/output.js';

/**
 * Result of an agent availability check.
 */
export interface AgentValidationResult {
  available: boolean;
  version?: string;
  error?: string;
}

/**
 * Port interface for validating agent tool availability.
 *
 * Implementations must:
 * - Check if the specified agent binary is available on the system
 * - Return version information when available
 * - Return descriptive error messages when unavailable
 */
export interface IAgentValidator {
  /**
   * Check if the specified agent tool is available on the system.
   *
   * @param agentType - The agent type to check
   * @returns Validation result with availability status
   */
  isAvailable(agentType: AgentType): Promise<AgentValidationResult>;
}
