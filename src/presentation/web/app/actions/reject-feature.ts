'use server';

import { resolve } from '@/lib/server-container';
import type { RejectAgentRunUseCase } from '@shepai/core/application/use-cases/agents/reject-agent-run.use-case';
import type { IFeatureRepository } from '@shepai/core/application/ports/output/repositories/feature-repository.interface';

export async function rejectFeature(
  featureId: string,
  feedback: string
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

    const rejectUseCase = resolve<RejectAgentRunUseCase>('RejectAgentRunUseCase');
    const result = await rejectUseCase.execute(feature.agentRunId, feedback);

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
