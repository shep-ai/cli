'use server';

import { resolve } from '@/lib/server-container';
import type { ResumeFeatureUseCase } from '@shepai/core/application/use-cases/features/resume-feature.use-case';

export async function resumeFeature(
  featureId: string
): Promise<{ resumed: boolean; error?: string }> {
  if (!featureId?.trim()) {
    return { resumed: false, error: 'id is required' };
  }

  try {
    const resumeFeatureUseCase = resolve<ResumeFeatureUseCase>('ResumeFeatureUseCase');
    await resumeFeatureUseCase.execute(featureId);
    return { resumed: true };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to resume feature';
    return { resumed: false, error: message };
  }
}
