'use server';

import { resolve } from '@/lib/server-container';
import type { ApproveAgentRunUseCase } from '@shepai/core/application/use-cases/agents/approve-agent-run.use-case';
import type { IFeatureRepository } from '@shepai/core/application/ports/output/repositories/feature-repository.interface';
import type { PrdApprovalPayload } from '@shepai/core/domain/generated/output';

export async function approveFeature(
  featureId: string,
  payload?: PrdApprovalPayload
): Promise<{ approved: boolean; error?: string }> {
  if (!featureId.trim()) {
    return { approved: false, error: 'Feature id is required' };
  }

  try {
    const featureRepo = resolve<IFeatureRepository>('IFeatureRepository');
    const feature = await featureRepo.findById(featureId);

    if (!feature) {
      return { approved: false, error: 'Feature not found' };
    }

    if (!feature.agentRunId) {
      return { approved: false, error: 'Feature has no agent run' };
    }

    const approveUseCase = resolve<ApproveAgentRunUseCase>('ApproveAgentRunUseCase');
    const result = await approveUseCase.execute(feature.agentRunId, payload);

    if (!result.approved) {
      return { approved: false, error: result.reason };
    }

    return { approved: true };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to approve feature';
    return { approved: false, error: message };
  }
}
