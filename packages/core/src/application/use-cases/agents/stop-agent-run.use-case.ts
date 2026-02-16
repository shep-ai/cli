/**
 * Stop Agent Run Use Case
 *
 * Sends SIGTERM to a running agent's worker process and marks it as cancelled.
 */

import { injectable, inject } from 'tsyringe';
import type { IAgentRunRepository } from '../../ports/output/agents/agent-run-repository.interface.js';
import { AgentRunStatus } from '../../../domain/generated/output.js';

@injectable()
export class StopAgentRunUseCase {
  constructor(
    @inject('IAgentRunRepository')
    private readonly agentRunRepository: IAgentRunRepository
  ) {}

  async execute(id: string): Promise<{ stopped: boolean; reason: string }> {
    const run = await this.agentRunRepository.findById(id);
    if (!run) {
      return { stopped: false, reason: 'Agent run not found' };
    }

    const terminalStatuses = new Set([
      AgentRunStatus.completed,
      AgentRunStatus.failed,
      AgentRunStatus.interrupted,
      AgentRunStatus.cancelled,
    ]);

    if (terminalStatuses.has(run.status)) {
      return { stopped: false, reason: `Agent run already in terminal state: ${run.status}` };
    }

    if (!run.pid) {
      // No PID — just mark as cancelled
      const now = new Date();
      await this.agentRunRepository.updateStatus(id, AgentRunStatus.cancelled, {
        error: 'Cancelled by user (no PID)',
        completedAt: now,
        updatedAt: now,
      });
      return { stopped: true, reason: 'Marked as cancelled (no PID to signal)' };
    }

    // Check if process is alive
    let alive = false;
    try {
      process.kill(run.pid, 0);
      alive = true;
    } catch {
      alive = false;
    }

    if (alive) {
      // Send SIGTERM for graceful shutdown
      try {
        process.kill(run.pid, 'SIGTERM');
      } catch {
        // Process may have died between check and signal
      }
    }

    const now = new Date();
    await this.agentRunRepository.updateStatus(id, AgentRunStatus.cancelled, {
      error: 'Cancelled by user',
      completedAt: now,
      updatedAt: now,
    });

    return {
      stopped: true,
      reason: alive
        ? `Sent SIGTERM to PID ${run.pid}`
        : `Process already dead, marked as cancelled`,
    };
  }
}
