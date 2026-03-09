'use server';

import { resolve } from '@/lib/server-container';
import type { IFeatureRepository } from '@shepai/core/application/ports/output/repositories/feature-repository.interface';
import type { IGitPrService } from '@shepai/core/application/ports/output/services/git-pr-service.interface';
import type { GetPlanArtifactUseCase } from '@shepai/core/application/use-cases/features/get-plan-artifact.use-case';
import type {
  MergeReviewData,
  MergeReviewPhase,
} from '@/components/common/merge-review/merge-review-config';
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

    // Load plan phases (best-effort)
    let phases: MergeReviewPhase[] | undefined;
    try {
      const planUseCase = resolve<GetPlanArtifactUseCase>('GetPlanArtifactUseCase');
      const plan = await planUseCase.execute(featureId);
      phases = plan.phases.map(({ id, name, description }) => ({ id, name, description }));
    } catch {
      // Plan unavailable — not critical
    }

    const worktreePath =
      feature.worktreePath ??
      (feature.repositoryPath && feature.branch
        ? computeWorktreePath(feature.repositoryPath, feature.branch)
        : null);

    if (!worktreePath) {
      return { pr, branch, phases, warning: pr ? undefined : 'No PR or diff data available' };
    }

    try {
      const gitPrService = resolve<IGitPrService>('IGitPrService');
      const [diffSummary, fileDiffs] = await Promise.all([
        gitPrService.getPrDiffSummary(worktreePath, 'main'),
        gitPrService.getFileDiffs(worktreePath, 'main').catch(() => undefined),
      ]);
      return { pr, branch, phases, diffSummary, fileDiffs };
    } catch {
      return { pr, branch, phases, warning: 'Diff statistics unavailable' };
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load merge review data';
    return { error: message };
  }
}
