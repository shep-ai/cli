'use server';

import { resolve } from '@/lib/server-container';
import type { IFeatureRepository } from '@shepai/core/application/ports/output/repositories/feature-repository.interface';
import type { IGitPrService } from '@shepai/core/application/ports/output/services/git-pr-service.interface';
import type { MergeReviewData } from '@/components/common/merge-review/merge-review-config';

type GetMergeReviewDataResult = MergeReviewData | { error: string };

export async function getMergeReviewData(featureId: string): Promise<GetMergeReviewDataResult> {
  if (!featureId.trim()) {
    return { error: 'Feature id is required' };
  }

  try {
    const featureRepo = resolve<IFeatureRepository>('IFeatureRepository');
    const feature = await featureRepo.findById(featureId);

    if (!feature) {
      return { error: 'Feature not found' };
    }

    if (!feature.pr) {
      return { error: 'No PR data available for this feature' };
    }

    const { url, number, status, commitHash, ciStatus } = feature.pr;
    const pr = { url, number, status, commitHash, ciStatus };

    if (!feature.worktreePath) {
      return { pr, warning: 'Diff statistics unavailable' };
    }

    try {
      const gitPrService = resolve<IGitPrService>('IGitPrService');
      const diffSummary = await gitPrService.getPrDiffSummary(feature.worktreePath, 'main');
      return { pr, diffSummary };
    } catch {
      return { pr, warning: 'Diff statistics unavailable' };
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load merge review data';
    return { error: message };
  }
}
