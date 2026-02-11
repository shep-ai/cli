/**
 * List Agent Runs Use Case
 *
 * Retrieves all agent runs sorted by most recent first.
 *
 * Business Rules:
 * - Returns all agent runs from the repository
 * - Results are sorted by createdAt descending (most recent first)
 */

import { injectable, inject } from 'tsyringe';
import type { AgentRun } from '../../../domain/generated/output.js';
import type { IAgentRunRepository } from '../../ports/output/agent-run-repository.interface.js';

@injectable()
export class ListAgentRunsUseCase {
  constructor(
    @inject('IAgentRunRepository')
    private readonly runRepo: IAgentRunRepository
  ) {}

  async execute(): Promise<AgentRun[]> {
    const runs = await this.runRepo.list();
    return runs.sort((a, b) => {
      const dateA =
        a.createdAt instanceof Date ? a.createdAt.getTime() : new Date(a.createdAt).getTime();
      const dateB =
        b.createdAt instanceof Date ? b.createdAt.getTime() : new Date(b.createdAt).getTime();
      return dateB - dateA;
    });
  }
}
