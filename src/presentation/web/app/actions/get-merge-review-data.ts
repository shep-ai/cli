'use server';

import { resolve } from '@/lib/server-container';
import type { IFeatureRepository } from '@shepai/core/application/ports/output/repositories/feature-repository.interface';
import type { IGitPrService } from '@shepai/core/application/ports/output/services/git-pr-service.interface';
import type { MergeReviewData } from '@/components/common/merge-review/merge-review-config';
import { computeWorktreePath } from '@shepai/core/infrastructure/services/ide-launchers/compute-worktree-path';

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

    const pr = feature.pr
      ? {
          url: feature.pr.url,
          number: feature.pr.number,
          status: feature.pr.status,
          commitHash: feature.pr.commitHash,
          ciStatus: feature.pr.ciStatus,
        }
      : undefined;

    const branch = feature.branch ? { source: feature.branch, target: 'main' } : undefined;

    const worktreePath =
      feature.worktreePath ??
      (feature.repositoryPath && feature.branch
        ? computeWorktreePath(feature.repositoryPath, feature.branch)
        : null);

    if (!worktreePath) {
      return { pr, branch, warning: pr ? undefined : 'No PR or diff data available' };
    }

    try {
      const gitPrService = resolve<IGitPrService>('IGitPrService');
      const [diffSummary, fileDiffs] = await Promise.all([
        gitPrService.getPrDiffSummary(worktreePath, 'main'),
        gitPrService.getFileDiffs(worktreePath, 'main').catch(() => undefined),
      ]);
      return { pr, branch, diffSummary, fileDiffs };
    } catch {
      return { pr, branch, warning: 'Diff statistics unavailable' };
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load merge review data';
    return { error: message };
  }
}
