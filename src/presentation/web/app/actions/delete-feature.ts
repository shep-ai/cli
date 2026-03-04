'use server';

import { resolve } from '@/lib/server-container';
import type { DeleteFeatureUseCase } from '@shepai/core/application/use-cases/features/delete-feature.use-case';
import type { Feature } from '@shepai/core/domain/generated/output';

export async function deleteFeature(
  featureId: string,
  cleanup?: boolean
): Promise<{ feature?: Feature; error?: string }> {
  if (!featureId?.trim()) {
    return { error: 'id is required' };
  }

  try {
    const deleteFeatureUseCase = resolve<DeleteFeatureUseCase>('DeleteFeatureUseCase');
    const feature =
      cleanup !== undefined
        ? await deleteFeatureUseCase.execute(featureId, { cleanup })
        : await deleteFeatureUseCase.execute(featureId);
    return { feature };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to delete feature';
    return { error: message };
  }
}
