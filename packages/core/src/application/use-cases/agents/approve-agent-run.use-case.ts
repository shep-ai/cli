/**
 * Approve Agent Run Use Case
 *
 * Approves a paused agent run (waiting_approval status) and
 * spawns a new resume worker to continue graph execution.
 */

import { injectable, inject } from 'tsyringe';
import type { IAgentRunRepository } from '../../ports/output/agents/agent-run-repository.interface.js';
import type { IFeatureAgentProcessService } from '../../ports/output/agents/feature-agent-process.interface.js';
import type { IPhaseTimingRepository } from '../../ports/output/agents/phase-timing-repository.interface.js';
import type { IFeatureRepository } from '../../ports/output/repositories/feature-repository.interface.js';
import type { IWorktreeService } from '../../ports/output/services/worktree-service.interface.js';
import { AgentRunStatus } from '../../../domain/generated/output.js';

@injectable()
export class ApproveAgentRunUseCase {
  constructor(
    @inject('IAgentRunRepository')
    private readonly agentRunRepository: IAgentRunRepository,
    @inject('IFeatureAgentProcessService')
    private readonly processService: IFeatureAgentProcessService,
    @inject('IFeatureRepository')
    private readonly featureRepository: IFeatureRepository,
    @inject('IWorktreeService')
    private readonly worktreeService: IWorktreeService,
    @inject('IPhaseTimingRepository')
    private readonly phaseTimingRepository: IPhaseTimingRepository
  ) {}

  async execute(id: string): Promise<{ approved: boolean; reason: string }> {
    const run = await this.agentRunRepository.findById(id);
    if (!run) {
      return { approved: false, reason: 'Agent run not found' };
    }

    if (run.status !== AgentRunStatus.waitingApproval) {
      return {
        approved: false,
        reason: `Agent run is not waiting for approval (status: ${run.status})`,
      };
    }

    // Look up the feature to get the branch for worktree path derivation
    const feature = run.featureId ? await this.featureRepository.findById(run.featureId) : null;

    const repoPath = run.repositoryPath ?? '';
    const worktreePath = feature
      ? this.worktreeService.getWorktreePath(repoPath, feature.branch)
      : repoPath;

    const now = new Date();
    await this.agentRunRepository.updateStatus(id, AgentRunStatus.running, {
      updatedAt: now,
    });

    // Compute and record approval wait duration
    try {
      const timings = await this.phaseTimingRepository.findByRunId(id);
      const waitingTiming = timings.find((t) => t.waitingApprovalAt && !t.approvalWaitMs);
      if (waitingTiming) {
        const waitStart =
          waitingTiming.waitingApprovalAt instanceof Date
            ? waitingTiming.waitingApprovalAt.getTime()
            : Number(waitingTiming.waitingApprovalAt);
        const approvalWaitMs = BigInt(now.getTime() - waitStart);
        await this.phaseTimingRepository.updateApprovalWait(waitingTiming.id, {
          approvalWaitMs,
        });
      }
    } catch {
      // Non-fatal: approval wait timing failure should not block approval
    }

    this.processService.spawn(
      run.featureId ?? '',
      id,
      repoPath,
      worktreePath, // specDir = worktree path (same as initial spawn)
      worktreePath,
      {
        resume: true,
        approvalGates: run.approvalGates,
        threadId: run.threadId,
        resumeFromInterrupt: true,
        push: feature?.push ?? false,
        openPr: feature?.openPr ?? false,
      }
    );

    return { approved: true, reason: 'Approved and resumed' };
  }
}
