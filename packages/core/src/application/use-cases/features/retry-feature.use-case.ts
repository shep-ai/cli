/**
 * Retry Feature Use Case
 *
 * Retries an interrupted, failed, or waiting_approval feature agent run
 * from the last checkpoint. Creates a new AgentRun record and spawns a
 * worker with --resume flag to continue from where the previous run left off.
 */

import { injectable, inject } from 'tsyringe';
import { randomUUID } from 'node:crypto';
import type { Feature, AgentRun } from '../../../domain/generated/output.js';
import { AgentRunStatus } from '../../../domain/generated/output.js';
import type { IFeatureRepository } from '../../ports/output/repositories/feature-repository.interface.js';
import type { IAgentRunRepository } from '../../ports/output/agents/agent-run-repository.interface.js';
import type { IFeatureAgentProcessService } from '../../ports/output/agents/feature-agent-process.interface.js';
import type { IWorktreeService } from '../../ports/output/services/worktree-service.interface.js';

const RESUMABLE_STATUSES = new Set<string>([
  AgentRunStatus.interrupted,
  AgentRunStatus.failed,
  AgentRunStatus.waitingApproval,
]);

export interface RetryFeatureResult {
  feature: Feature;
  newRun: AgentRun;
}

@injectable()
export class RetryFeatureUseCase {
  constructor(
    @inject('IFeatureRepository')
    private readonly featureRepo: IFeatureRepository,
    @inject('IAgentRunRepository')
    private readonly runRepo: IAgentRunRepository,
    @inject('IFeatureAgentProcessService')
    private readonly processService: IFeatureAgentProcessService,
    @inject('IWorktreeService')
    private readonly worktreeService: IWorktreeService
  ) {}

  async execute(featureId: string): Promise<RetryFeatureResult> {
    // Resolve feature by exact ID or prefix
    const feature =
      (await this.featureRepo.findById(featureId)) ??
      (await this.featureRepo.findByIdPrefix(featureId));
    if (!feature) {
      throw new Error(`Feature not found: ${featureId}`);
    }

    // Load the most recent agent run
    if (!feature.agentRunId) {
      throw new Error(`No agent run found for feature "${feature.name}"`);
    }

    const lastRun = await this.runRepo.findById(feature.agentRunId);
    if (!lastRun) {
      throw new Error(`No agent run found for feature "${feature.name}"`);
    }

    // Detect crashed processes: if DB says "running" but the process is dead,
    // mark it as interrupted so it becomes resumable
    if (
      (lastRun.status === AgentRunStatus.running || lastRun.status === AgentRunStatus.pending) &&
      feature.agentRunId
    ) {
      await this.processService.checkAndMarkCrashed(feature.agentRunId);
      // Re-read after potential status change
      const refreshed = await this.runRepo.findById(feature.agentRunId);
      if (refreshed) {
        Object.assign(lastRun, refreshed);
      }
    }

    // Validate the run is in a resumable state
    if (lastRun.status === AgentRunStatus.running) {
      throw new Error('Agent is still running — stop it first before resuming');
    }
    if (lastRun.status === AgentRunStatus.completed) {
      throw new Error('Agent already completed successfully');
    }
    if (!RESUMABLE_STATUSES.has(lastRun.status)) {
      throw new Error(`Agent run is not in a resumable state (status: ${lastRun.status})`);
    }

    // Create a new agent run record that continues the same thread
    const now = new Date();
    const newRunId = randomUUID();
    const newRun: AgentRun = {
      id: newRunId,
      agentType: lastRun.agentType,
      agentName: lastRun.agentName,
      status: AgentRunStatus.pending,
      prompt: lastRun.prompt,
      threadId: lastRun.threadId, // Same thread for checkpoint continuity
      featureId: feature.id,
      repositoryPath: feature.repositoryPath,
      approvalGates: lastRun.approvalGates,
      createdAt: now,
      updatedAt: now,
    };
    await this.runRepo.create(newRun);

    // Update feature to reference the new run
    await this.featureRepo.update({
      ...feature,
      agentRunId: newRunId,
      updatedAt: now,
    });

    // Derive worktree path and spawn resume worker
    const worktreePath = this.worktreeService.getWorktreePath(
      feature.repositoryPath,
      feature.branch
    );

    this.processService.spawn(
      feature.id,
      newRunId,
      feature.repositoryPath,
      worktreePath,
      worktreePath,
      {
        resume: true,
        approvalGates: lastRun.approvalGates,
        threadId: lastRun.threadId,
        resumeFromInterrupt: lastRun.status === AgentRunStatus.waitingApproval,
        push: feature.push,
        openPr: feature.openPr,
      }
    );

    return { feature, newRun };
  }
}
