/**
 * Reject Agent Run Use Case
 *
 * Rejects a paused agent run (waiting_approval status) and
 * marks it as cancelled with the rejection reason.
 */

import { injectable, inject } from 'tsyringe';
import type { IAgentRunRepository } from '../../ports/output/agents/agent-run-repository.interface.js';
import { AgentRunStatus } from '../../../domain/generated/output.js';

@injectable()
export class RejectAgentRunUseCase {
  constructor(
    @inject('IAgentRunRepository')
    private readonly agentRunRepository: IAgentRunRepository
  ) {}

  async execute(id: string, reason?: string): Promise<{ rejected: boolean; reason: string }> {
    const run = await this.agentRunRepository.findById(id);
    if (!run) {
      return { rejected: false, reason: 'Agent run not found' };
    }

    if (run.status !== AgentRunStatus.waitingApproval) {
      return {
        rejected: false,
        reason: `Agent run is not waiting for approval (status: ${run.status})`,
      };
    }

    const now = new Date();
    await this.agentRunRepository.updateStatus(id, AgentRunStatus.cancelled, {
      approvalStatus: 'rejected',
      error: reason ?? 'Rejected by user',
      completedAt: now,
      updatedAt: now,
    });

    return { rejected: true, reason: 'Rejected and cancelled' };
  }
}
