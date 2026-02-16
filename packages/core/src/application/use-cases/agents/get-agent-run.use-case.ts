/**
 * Get Agent Run Use Case
 *
 * Retrieves agent run details by ID for display purposes.
 */

import { injectable, inject } from 'tsyringe';
import type { AgentRun } from '../../../domain/generated/output.js';
import type { IAgentRunRepository } from '../../ports/output/agents/agent-run-repository.interface.js';

/**
 * Use case for getting a specific agent run by ID.
 */
@injectable()
export class GetAgentRunUseCase {
  constructor(
    @inject('IAgentRunRepository')
    private readonly agentRunRepository: IAgentRunRepository
  ) {}

  /**
   * Get an agent run by ID.
   *
   * @param id - The agent run ID
   * @returns The agent run or null if not found
   */
  async execute(id: string): Promise<AgentRun | null> {
    return this.agentRunRepository.findById(id);
  }
}
