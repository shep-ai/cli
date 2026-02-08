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
} from '../../ports/output/agent-validator.interface.js';
import type { ILogger } from '../../ports/output/logger.interface.js';

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
    private readonly agentValidator: IAgentValidator,
    @inject('ILogger')
    private readonly logger: ILogger
  ) {}

  /**
   * Execute the validate agent auth use case.
   *
   * @param agentType - The agent type to validate
   * @returns Validation result with availability status
   */
  async execute(agentType: AgentType): Promise<AgentValidationResult> {
    this.logger.debug('Validating agent availability', {
      source: 'use-case:agent',
      agentType,
    });

    const result = await this.agentValidator.isAvailable(agentType);

    if (result.available) {
      this.logger.info('Agent validation successful', {
        source: 'use-case:agent',
        agentType,
        version: result.version,
      });
    } else {
      this.logger.warn('Agent validation failed', {
        source: 'use-case:agent',
        agentType,
        error: result.error,
      });
    }

    return result;
  }
}
