import { resolve } from '@/lib/server-container';
import type { IFeatureRepository } from '@shepai/core/application/ports/output/repositories/feature-repository.interface';
import type { IAgentRunRepository } from '@shepai/core/application/ports/output/agents/agent-run-repository.interface';
import type { IRepositoryRepository } from '@shepai/core/application/ports/output/repositories/repository-repository.interface';
import type { IGitPrService } from '@shepai/core/application/ports/output/services/git-pr-service.interface';
import type { GetFeatureArtifactUseCase } from '@shepai/core/application/use-cases/features/get-feature-artifact.use-case';
import { buildFeatureNodeData } from '@/app/build-feature-node-data';
import { computeDrawerView } from '@/components/common/control-center-drawer/drawer-view';
import { FeatureDrawerClient } from '@/components/common/control-center-drawer/feature-drawer-client';

/** Skip static pre-rendering since we need runtime DI container. */
export const dynamic = 'force-dynamic';

interface FeatureDrawerPageProps {
  params: Promise<{ featureId: string }>;
}

export default async function FeatureDrawerPage({ params }: FeatureDrawerPageProps) {
  const { featureId } = await params;

  try {
    const featureRepo = resolve<IFeatureRepository>('IFeatureRepository');
    const agentRunRepo = resolve<IAgentRunRepository>('IAgentRunRepository');
    const repoRepo = resolve<IRepositoryRepository>('IRepositoryRepository');
    const gitPrService = resolve<IGitPrService>('IGitPrService');

    const feature = await featureRepo.findById(featureId);
    if (!feature) return null;

    const run = feature.agentRunId ? await agentRunRepo.findById(feature.agentRunId) : null;

    // Resolve repository name, base branch, and one-liner for the overview tab
    const getArtifact = resolve<GetFeatureArtifactUseCase>('GetFeatureArtifactUseCase');
    const [repo, baseBranch, artifact, remoteUrl, liveMergeable] = await Promise.all([
      repoRepo.findByPath(feature.repositoryPath).catch(() => null),
      gitPrService.getDefaultBranch(feature.repositoryPath).catch(() => 'main'),
      getArtifact.execute(featureId).catch(() => null),
      gitPrService.getRemoteUrl(feature.repositoryPath).catch(() => null),
      feature.pr?.number
        ? gitPrService
            .getMergeableStatus(feature.repositoryPath, feature.pr.number)
            .catch(() => undefined)
        : Promise.resolve(undefined),
    ]);

    // Merge live mergeable status into feature PR data so the UI always
    // reflects the current GitHub state, even if the background watcher
    // hasn't polled yet.
    if (feature.pr && liveMergeable !== undefined) {
      feature.pr = { ...feature.pr, mergeable: liveMergeable };
      // Persist so subsequent loads don't need a live fetch
      featureRepo.update(feature).catch(() => {
        /* best-effort */
      });
    }

    const nodeData = buildFeatureNodeData(feature, run, {
      repositoryName: repo?.name,
      baseBranch,
      oneLiner: artifact?.oneLiner,
      remoteUrl: remoteUrl ?? undefined,
    });

    const view = computeDrawerView({
      selectedNode: nodeData,
      isCreateDrawerOpen: false,
      pendingRepositoryPath: '',
      pendingParentFeatureId: undefined,
      selectedRepoNode: null,
      features: [],
      workflowDefaults: undefined,
    });

    if (!view) return null;

    return <FeatureDrawerClient view={view} />;
  } catch {
    // Feature not found — render nothing (drawer stays closed)
    return null;
  }
}
