'use server';

import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { resolve } from '@/lib/server-container';
import type { IFeatureRepository } from '@shepai/core/application/ports/output/repositories/feature-repository.interface';
import type { IGitPrService } from '@shepai/core/application/ports/output/services/git-pr-service.interface';
import type {
  MergeReviewData,
  MergeReviewEvidence,
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

    const worktreePath =
      feature.worktreePath ??
      (feature.repositoryPath && feature.branch
        ? computeWorktreePath(feature.repositoryPath, feature.branch)
        : null);

    // Load evidence manifest (best-effort)
    let evidence: MergeReviewEvidence[] | undefined;
    let evidenceBasePath: string | undefined;
    if (worktreePath) {
      try {
        // Worktree path: ~/.shep/repos/<hash>/wt/<slug>
        // Evidence manifest: ~/.shep/repos/<hash>/evidence/manifest.json
        const repoHashDir = dirname(dirname(worktreePath));
        const evidenceDir = join(repoHashDir, 'evidence');
        const manifestPath = join(evidenceDir, 'manifest.json');
        if (existsSync(manifestPath)) {
          evidence = JSON.parse(readFileSync(manifestPath, 'utf-8'));
          evidenceBasePath = evidenceDir;
        }
      } catch {
        // Evidence unavailable — not critical
      }
    }

    if (!worktreePath) {
      return {
        pr,
        branch,
        evidence,
        evidenceBasePath,
        warning: pr ? undefined : 'No PR or diff data available',
      };
    }

    try {
      const gitPrService = resolve<IGitPrService>('IGitPrService');
      const [diffSummary, fileDiffs] = await Promise.all([
        gitPrService.getPrDiffSummary(worktreePath, 'main'),
        gitPrService.getFileDiffs(worktreePath, 'main').catch(() => undefined),
      ]);
      return { pr, branch, diffSummary, fileDiffs, evidence, evidenceBasePath };
    } catch {
      return {
        pr,
        branch,
        evidence,
        evidenceBasePath,
        warning: 'Diff statistics unavailable',
      };
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load merge review data';
    return { error: message };
  }
}
