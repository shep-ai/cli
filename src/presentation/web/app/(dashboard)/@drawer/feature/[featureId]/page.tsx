import { resolve } from '@/lib/server-container';
import type { IFeatureRepository } from '@shepai/core/application/ports/output/repositories/feature-repository.interface';
import type { IAgentRunRepository } from '@shepai/core/application/ports/output/agents/agent-run-repository.interface';
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

    const feature = await featureRepo.findById(featureId);
    if (!feature) return null;

    const run = feature.agentRunId ? await agentRunRepo.findById(feature.agentRunId) : null;

    const nodeData = buildFeatureNodeData(feature, run);

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
  } catch (error) {
    console.error('[drawer] Error in FeatureDrawerPage:', error);
    // Feature not found — render nothing (drawer stays closed)
    return null;
  }
}
