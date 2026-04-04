'use server';

import { resolve } from '@/lib/server-container';
import type { UpdateFeaturePinnedConfigUseCase } from '@shepai/core/application/use-cases/features/update-feature-pinned-config.use-case';

export async function updateFeaturePinnedConfig(
  featureId: string,
  agentType: string,
  modelId: string
): Promise<{ ok: boolean; error?: string }> {
  const normalizedFeatureId = featureId.trim();
  if (!normalizedFeatureId) {
    return { ok: false, error: 'Feature id is required' };
  }

  const normalizedAgentType = agentType.trim();
  if (!normalizedAgentType) {
    return { ok: false, error: 'Agent type is required' };
  }

  const normalizedModelId = modelId.trim();
  if (!normalizedModelId) {
    return { ok: false, error: 'Model id is required' };
  }

  try {
    const useCase = resolve<UpdateFeaturePinnedConfigUseCase>('UpdateFeaturePinnedConfigUseCase');
    await useCase.execute({
      featureId: normalizedFeatureId,
      agentType: normalizedAgentType,
      modelId: normalizedModelId,
    });
    return { ok: true };
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Failed to update feature pinned config';
    return { ok: false, error: message };
  }
}
