'use server';

import { resolve } from '@/lib/server-container';
import type { IFeatureRepository } from '@shepai/core/application/ports/output/repositories/feature-repository.interface';
import type { IAgentRunRepository } from '@shepai/core/application/ports/output/agents/agent-run-repository.interface';
import type { IRepositoryRepository } from '@shepai/core/application/ports/output/repositories/repository-repository.interface';
import type { IGitPrService } from '@shepai/core/application/ports/output/services/git-pr-service.interface';
import type { GetFeatureArtifactUseCase } from '@shepai/core/application/use-cases/features/get-feature-artifact.use-case';
import { CiStatus } from '@shepai/core/domain/generated/output';
import { buildFeatureNodeData } from '@/app/build-feature-node-data';
import type { FeatureNodeData } from '@/components/common/feature-node';

const CI_STATUS_MAP: Record<string, CiStatus> = {
  success: CiStatus.Success,
  failure: CiStatus.Failure,
  pending: CiStatus.Pending,
};

/**
 * Fetches full FeatureNodeData for a given feature ID.
 * Used by the drawer for targeted data syncing without triggering
 * a full router.refresh() / server component re-render.
 */
export async function getFeatureDrawerData(featureId: string): Promise<FeatureNodeData | null> {
  try {
    const featureRepo = resolve<IFeatureRepository>('IFeatureRepository');
    const agentRunRepo = resolve<IAgentRunRepository>('IAgentRunRepository');
    const repoRepo = resolve<IRepositoryRepository>('IRepositoryRepository');
    const gitPrService = resolve<IGitPrService>('IGitPrService');
    const getArtifact = resolve<GetFeatureArtifactUseCase>('GetFeatureArtifactUseCase');

    const feature = await featureRepo.findById(featureId);
    if (!feature) return null;

    const run = feature.agentRunId ? await agentRunRepo.findById(feature.agentRunId) : null;

    const [repo, baseBranch, artifact, remoteUrl, liveMergeable, liveCiResult] = await Promise.all([
      repoRepo.findByPath(feature.repositoryPath).catch(() => null),
      gitPrService.getDefaultBranch(feature.repositoryPath).catch(() => 'main'),
      getArtifact.execute(featureId).catch(() => null),
      gitPrService.getRemoteUrl(feature.repositoryPath).catch(() => null),
      feature.pr?.number
        ? gitPrService
            .getMergeableStatus(feature.repositoryPath, feature.pr.number)
            .catch(() => undefined)
        : Promise.resolve(undefined),
      feature.branch
        ? gitPrService.getCiStatus(feature.repositoryPath, feature.branch).catch(() => undefined)
        : Promise.resolve(undefined),
    ]);

    // Merge live PR status into feature data
    if (feature.pr) {
      const liveCiStatus = liveCiResult
        ? (CI_STATUS_MAP[liveCiResult.status] ?? CiStatus.Pending)
        : undefined;
      const updates: Record<string, unknown> = {};
      if (liveMergeable !== undefined) updates.mergeable = liveMergeable;
      if (liveCiStatus !== undefined) updates.ciStatus = liveCiStatus;

      if (Object.keys(updates).length > 0) {
        feature.pr = { ...feature.pr, ...updates };
        featureRepo.update(feature).catch(() => {
          /* best-effort persist */
        });
      }
    }

    return buildFeatureNodeData(feature, run, {
      repositoryName: repo?.name,
      baseBranch,
      oneLiner: artifact?.oneLiner,
      remoteUrl: remoteUrl ?? undefined,
    });
  } catch {
    return null;
  }
}
