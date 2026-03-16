'use server';

import { resolve } from '@/lib/server-container';
import type { RejectAgentRunUseCase } from '@shepai/core/application/use-cases/agents/reject-agent-run.use-case';
import type { ResumeFeatureUseCase } from '@shepai/core/application/use-cases/features/resume-feature.use-case';
import type { IFeatureRepository } from '@shepai/core/application/ports/output/repositories/feature-repository.interface';
import type { IAgentRunRepository } from '@shepai/core/application/ports/output/agents/agent-run-repository.interface';
import { AgentRunStatus } from '@shepai/core/domain/generated/output';

const ERROR_STATUSES = new Set<string>([AgentRunStatus.failed, AgentRunStatus.interrupted]);

export async function rejectFeature(
  featureId: string,
  feedback: string,
  attachments?: string[]
): Promise<{
  rejected: boolean;
  iteration?: number;
  iterationWarning?: boolean;
  error?: string;
}> {
  if (!featureId.trim()) {
    return { rejected: false, error: 'Feature id is required' };
  }

  if (!feedback.trim()) {
    return { rejected: false, error: 'Feedback is required' };
  }

  try {
    const featureRepo = resolve<IFeatureRepository>('IFeatureRepository');
    const feature = await featureRepo.findById(featureId);

    if (!feature) {
      return { rejected: false, error: 'Feature not found' };
    }

    if (!feature.agentRunId) {
      return { rejected: false, error: 'Feature has no agent run' };
    }

    const runRepo = resolve<IAgentRunRepository>('IAgentRunRepository');
    const run = await runRepo.findById(feature.agentRunId);

    if (run && ERROR_STATUSES.has(run.status)) {
      const resumeUseCase = resolve<ResumeFeatureUseCase>('ResumeFeatureUseCase');
      await resumeUseCase.execute(featureId, { promptPrefix: feedback });
      return { rejected: true, iteration: 1 };
    }

    const rejectUseCase = resolve<RejectAgentRunUseCase>('RejectAgentRunUseCase');
    const result = await rejectUseCase.execute(feature.agentRunId, feedback, attachments);

    if (!result.rejected) {
      return { rejected: false, error: result.reason };
    }

    return {
      rejected: true,
      iteration: result.iteration,
      iterationWarning: result.iterationWarning,
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to reject feature';
    return { rejected: false, error: message };
  }
}
