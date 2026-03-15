/**
 * Start Feature Use Case
 *
 * Transitions a Pending feature to its active lifecycle and spawns
 * the agent. Validates lifecycle state, checks parent dependency
 * gates, and reuses the existing AgentRun record.
 */

import { injectable, inject } from 'tsyringe';
import type { Feature, AgentRun } from '../../../domain/generated/output.js';
import { SdlcLifecycle } from '../../../domain/generated/output.js';
import type { IFeatureRepository } from '../../ports/output/repositories/feature-repository.interface.js';
import type { IAgentRunRepository } from '../../ports/output/agents/agent-run-repository.interface.js';
import type { IFeatureAgentProcessService } from '../../ports/output/agents/feature-agent-process.interface.js';
import type { IWorktreeService } from '../../ports/output/services/worktree-service.interface.js';
import { POST_IMPLEMENTATION } from '../../../domain/lifecycle-gates.js';

export interface StartFeatureResult {
  feature: Feature;
  agentRun: AgentRun;
}

@injectable()
export class StartFeatureUseCase {
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

  async execute(featureId: string): Promise<StartFeatureResult> {
    // Resolve feature by exact ID or prefix
    const feature =
      (await this.featureRepo.findById(featureId)) ??
      (await this.featureRepo.findByIdPrefix(featureId));
    if (!feature) {
      throw new Error(`Feature not found: ${featureId}`);
    }

    // Validate lifecycle is Pending
    if (feature.lifecycle !== SdlcLifecycle.Pending) {
      throw new Error(
        `Feature "${feature.name}" is not in Pending state (current: ${feature.lifecycle}). Only pending features can be started.`
      );
    }

    // Validate agentRunId exists
    if (!feature.agentRunId) {
      throw new Error(`No agent run found for feature "${feature.name}"`);
    }

    const agentRun = await this.runRepo.findById(feature.agentRunId);
    if (!agentRun) {
      throw new Error(`No agent run found for feature "${feature.name}"`);
    }

    // Validate specPath
    if (!feature.specPath) {
      throw new Error(`Feature "${feature.name}" is missing specPath — cannot start`);
    }

    // Check parent gate if feature has a parent
    let targetLifecycle = feature.fast ? SdlcLifecycle.Implementation : SdlcLifecycle.Requirements;
    let shouldSpawn = true;

    if (feature.parentId) {
      const parent = await this.featureRepo.findById(feature.parentId);
      if (
        !parent ||
        parent.lifecycle === SdlcLifecycle.Blocked ||
        !POST_IMPLEMENTATION.has(parent.lifecycle)
      ) {
        targetLifecycle = SdlcLifecycle.Blocked;
        shouldSpawn = false;
      }
    }

    // Transition lifecycle
    const updatedFeature: Feature = {
      ...feature,
      lifecycle: targetLifecycle,
      updatedAt: new Date(),
    };
    await this.featureRepo.update(updatedFeature);

    // Spawn agent if not blocked
    if (shouldSpawn) {
      const worktreePath = this.worktreeService.getWorktreePath(
        feature.repositoryPath,
        feature.branch
      );

      this.processService.spawn(
        feature.id,
        feature.agentRunId,
        feature.repositoryPath,
        feature.specPath,
        worktreePath,
        {
          approvalGates: feature.approvalGates,
          threadId: agentRun.threadId,
          push: feature.push,
          openPr: feature.openPr,
          agentType: agentRun.agentType,
          ...(feature.fast ? { fast: true } : {}),
          ...(agentRun.modelId ? { model: agentRun.modelId } : {}),
        }
      );
    }

    return { feature: updatedFeature, agentRun };
  }
}
