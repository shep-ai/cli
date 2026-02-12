/**
 * List Agent Runs Use Case
 *
 * Retrieves all agent runs for listing/display purposes.
 */

import { injectable, inject } from 'tsyringe';
import type { AgentRun } from '../../../domain/generated/output.js';
import type { IAgentRunRepository } from '../../ports/output/agent-run-repository.interface.js';

/**
 * Use case for listing all agent runs.
 */
@injectable()
export class ListAgentRunsUseCase {
  constructor(
    @inject('IAgentRunRepository')
    private readonly agentRunRepository: IAgentRunRepository
  ) {}

  /**
   * List all agent runs sorted by creation time (most recent first).
   *
   * @returns Array of agent runs sorted by createdAt descending
   */
  async execute(): Promise<AgentRun[]> {
    const runs = await this.agentRunRepository.list();

    return runs.sort((a, b) => {
      const dateA =
        typeof a.createdAt === 'string'
          ? new Date(a.createdAt).getTime()
          : a.createdAt instanceof Date
            ? a.createdAt.getTime()
            : 0;
      const dateB =
        typeof b.createdAt === 'string'
          ? new Date(b.createdAt).getTime()
          : b.createdAt instanceof Date
            ? b.createdAt.getTime()
            : 0;

      return dateB - dateA; // Descending order (most recent first)
    });
  }
}
