'use server';

import { resolve } from '@/lib/server-container';
import type { UpdateFeatureParentUseCase } from '@shepai/core/application/use-cases/features/update-feature-parent.use-case';

export async function updateFeatureParent(
  featureId: string,
  parentId: string | null
): Promise<{ success: boolean; blocked?: boolean; unblocked?: boolean; error?: string }> {
  if (!featureId?.trim()) {
    return { success: false, error: 'Feature id is required' };
  }

  try {
    const useCase = resolve<UpdateFeatureParentUseCase>('UpdateFeatureParentUseCase');
    const result = await useCase.execute({ featureId, parentId });
    return { success: true, blocked: result.blocked, unblocked: result.unblocked };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update feature parent';
    return { success: false, error: message };
  }
}
