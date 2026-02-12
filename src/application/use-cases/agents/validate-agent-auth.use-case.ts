/**
 * Validate Agent Auth Use Case
 *
 * Validates that an AI coding agent is available and properly configured.
 * Delegates to the IAgentValidator port for actual system checks.
 *
 * Business Rules:
 * - Checks agent binary availability on the system
 * - Returns validation result with version or error details
 */

import { injectable, inject } from 'tsyringe';
import type { AgentType } from '../../../domain/generated/output.js';
import type {
  IAgentValidator,
  AgentValidationResult,
} from '../../ports/output/agents/agent-validator.interface.js';

/**
 * Use case for validating agent availability.
 *
 * Algorithm:
 * 1. Delegate to IAgentValidator to check binary availability
 * 2. Return validation result
 */
@injectable()
export class ValidateAgentAuthUseCase {
  constructor(
    @inject('IAgentValidator')
    private readonly agentValidator: IAgentValidator
  ) {}

  /**
   * Execute the validate agent auth use case.
   *
   * @param agentType - The agent type to validate
   * @returns Validation result with availability status
   */
  async execute(agentType: AgentType): Promise<AgentValidationResult> {
    return this.agentValidator.isAvailable(agentType);
  }
}
