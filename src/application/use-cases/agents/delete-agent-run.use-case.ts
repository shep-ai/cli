/**
 * Delete Agent Run Use Case
 *
 * Removes an agent run record from the database.
 * Refuses to delete running agents — stop them first.
 */

import { injectable, inject } from 'tsyringe';
import type { IAgentRunRepository } from '../../ports/output/agent-run-repository.interface.js';
import { AgentRunStatus } from '../../../domain/generated/output.js';

@injectable()
export class DeleteAgentRunUseCase {
  constructor(
    @inject('IAgentRunRepository')
    private readonly agentRunRepository: IAgentRunRepository
  ) {}

  async execute(id: string): Promise<{ deleted: boolean; reason: string }> {
    const run = await this.agentRunRepository.findById(id);
    if (!run) {
      return { deleted: false, reason: 'Agent run not found' };
    }

    if (run.status === AgentRunStatus.running) {
      return {
        deleted: false,
        reason: `Cannot delete a running agent. Stop it first with: shep agent stop ${id.substring(0, 8)}`,
      };
    }

    await this.agentRunRepository.delete(id);
    return { deleted: true, reason: 'Agent run deleted' };
  }
}
