'use server';

import { resolve } from '@/lib/server-container';
import type { StartFeatureUseCase } from '@shepai/core/application/use-cases/features/start-feature.use-case';

export async function startFeature(
  featureId: string
): Promise<{ started: boolean; error?: string }> {
  if (!featureId.trim()) {
    return { started: false, error: 'Feature id is required' };
  }

  try {
    const useCase = resolve<StartFeatureUseCase>('StartFeatureUseCase');
    await useCase.execute(featureId);
    return { started: true };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to start feature';
    return { started: false, error: message };
  }
}
