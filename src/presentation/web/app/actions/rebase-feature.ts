'use server';

import { resolve } from '@/lib/server-container';
import type { RebaseFeatureOnMainUseCase } from '@shepai/core/application/use-cases/features/rebase-feature-on-main.use-case';

export async function rebaseFeature(
  featureId: string
): Promise<{ success: boolean; error?: string }> {
  if (!featureId?.trim()) {
    return { success: false, error: 'Feature id is required' };
  }

  try {
    const useCase = resolve<RebaseFeatureOnMainUseCase>('RebaseFeatureOnMainUseCase');
    await useCase.execute(featureId);
    return { success: true };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to rebase feature';
    return { success: false, error: message };
  }
}
