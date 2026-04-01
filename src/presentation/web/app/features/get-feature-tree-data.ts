import { resolve } from '@/lib/server-container';
import type { ListFeaturesUseCase } from '@shepai/core/application/use-cases/features/list-features.use-case';
import type { ListRepositoriesUseCase } from '@shepai/core/application/use-cases/repositories/list-repositories.use-case';
import type { FeatureTreeRow } from '@/components/features/feature-tree-table';
import type { FeatureStatus } from '@/components/common/feature-status-config';
import { SdlcLifecycle } from '@shepai/core/domain/generated/output';

const LIFECYCLE_TO_STATUS: Record<string, FeatureStatus> = {
  [SdlcLifecycle.Started]: 'pending',
  [SdlcLifecycle.Analyze]: 'in-progress',
  [SdlcLifecycle.Requirements]: 'action-needed',
  [SdlcLifecycle.Research]: 'in-progress',
  [SdlcLifecycle.Planning]: 'in-progress',
  [SdlcLifecycle.Implementation]: 'in-progress',
  [SdlcLifecycle.Review]: 'action-needed',
  [SdlcLifecycle.Maintain]: 'done',
  [SdlcLifecycle.Blocked]: 'blocked',
  [SdlcLifecycle.Pending]: 'pending',
  [SdlcLifecycle.Deleting]: 'blocked',
  [SdlcLifecycle.AwaitingUpstream]: 'action-needed',
  [SdlcLifecycle.Archived]: 'done',
};

function lifecycleToStatus(lifecycle: SdlcLifecycle): FeatureStatus {
  return LIFECYCLE_TO_STATUS[lifecycle] ?? 'pending';
}

export async function getFeatureTreeData(): Promise<FeatureTreeRow[]> {
  const listFeatures = resolve<ListFeaturesUseCase>('ListFeaturesUseCase');
  const listRepos = resolve<ListRepositoriesUseCase>('ListRepositoriesUseCase');

  const [features, repositories] = await Promise.all([listFeatures.execute(), listRepos.execute()]);

  const repoNameByPath = new Map<string, string>();
  for (const repo of repositories) {
    repoNameByPath.set(repo.path, repo.name);
  }

  return features.map((feature) => ({
    id: feature.id,
    name: feature.name,
    status: lifecycleToStatus(feature.lifecycle),
    lifecycle: feature.lifecycle,
    branch: feature.branch,
    repositoryName:
      repoNameByPath.get(feature.repositoryPath) ??
      feature.repositoryPath.split('/').pop() ??
      feature.repositoryPath,
    parentId: feature.parentId ?? undefined,
  }));
}
