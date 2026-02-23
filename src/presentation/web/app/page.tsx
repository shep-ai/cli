import { ControlCenter } from '@/components/features/control-center';
import { resolve } from '@/lib/server-container';
import type { ListFeaturesUseCase } from '@shepai/core/application/use-cases/features/list-features.use-case';
import type { ListRepositoriesUseCase } from '@shepai/core/application/use-cases/repositories/list-repositories.use-case';
import type { IAgentRunRepository } from '@shepai/core/application/ports/output/agents/agent-run-repository.interface';
import {
  deriveNodeState,
  deriveProgress,
} from '@/components/common/feature-node/derive-feature-state';
import { layoutWithDagre } from '@/lib/layout-with-dagre';
import type { CanvasNodeType } from '@/components/features/features-canvas';
import type { Edge } from '@xyflow/react';
import type { FeatureNodeData, FeatureLifecyclePhase } from '@/components/common/feature-node';

/** Skip static pre-rendering since we need runtime DI container and server context. */
export const dynamic = 'force-dynamic';

/** Map domain SdlcLifecycle enum values to UI FeatureLifecyclePhase (1:1). */
const lifecycleMap: Record<string, FeatureLifecyclePhase> = {
  Requirements: 'requirements',
  Research: 'research',
  Implementation: 'implementation',
  Review: 'review',
  'Deploy & QA': 'deploy',
  Maintain: 'maintain',
};

/** Map agent graph node names (from agent_run.result) to UI lifecycle phases. */
const nodeToLifecyclePhase: Record<string, FeatureLifecyclePhase> = {
  analyze: 'requirements',
  requirements: 'requirements',
  research: 'research',
  plan: 'implementation',
  implement: 'implementation',
  merge: 'review',
};

export default async function HomePage() {
  const listFeatures = resolve<ListFeaturesUseCase>('ListFeaturesUseCase');
  const listRepos = resolve<ListRepositoriesUseCase>('ListRepositoriesUseCase');
  const agentRunRepo = resolve<IAgentRunRepository>('IAgentRunRepository');

  const [features, repositories] = await Promise.all([listFeatures.execute(), listRepos.execute()]);

  const featuresWithRuns = await Promise.all(
    features.map(async (feature) => {
      const run = feature.agentRunId ? await agentRunRepo.findById(feature.agentRunId) : null;
      return { feature, run };
    })
  );

  // Group features by repository path (features may still reference paths not yet in repositories table)
  const featuresByRepo: Record<string, typeof featuresWithRuns> = {};
  featuresWithRuns.forEach((entry) => {
    const repoKey = entry.feature.repositoryPath;
    if (!featuresByRepo[repoKey]) {
      featuresByRepo[repoKey] = [];
    }
    featuresByRepo[repoKey].push(entry);
  });

  const nodes: CanvasNodeType[] = [];
  const edges: Edge[] = [];

  // First, add nodes for all persisted repositories (including those without features)
  for (const repo of repositories) {
    const repoNodeId = `repo-${repo.id}`;
    nodes.push({
      id: repoNodeId,
      type: 'repositoryNode',
      position: { x: 0, y: 0 },
      data: { name: repo.name, repositoryPath: repo.path, id: repo.id },
    });

    const repoFeatures = featuresByRepo[repo.path] ?? [];
    repoFeatures.forEach(({ feature, run }) => {
      const agentNode = run?.result?.startsWith('node:') ? run.result.slice(5) : undefined;
      const lifecycle: FeatureLifecyclePhase =
        run?.status === 'completed'
          ? 'maintain'
          : ((agentNode ? nodeToLifecyclePhase[agentNode] : undefined) ??
            lifecycleMap[feature.lifecycle] ??
            'requirements');

      const nodeData: FeatureNodeData = {
        name: feature.name,
        description: feature.description ?? feature.slug,
        featureId: feature.id,
        lifecycle,
        repositoryPath: feature.repositoryPath,
        branch: feature.branch,
        specPath: feature.specPath,
        state: deriveNodeState(feature, run),
        progress: deriveProgress(feature),
        ...(run?.agentType && { agentType: run.agentType as FeatureNodeData['agentType'] }),
        ...(run?.error && { errorMessage: run.error }),
      };

      const featureNodeId = `feat-${feature.id}`;
      nodes.push({
        id: featureNodeId,
        type: 'featureNode',
        position: { x: 0, y: 0 },
        data: nodeData,
      });

      edges.push({
        id: `edge-${repoNodeId}-${featureNodeId}`,
        source: repoNodeId,
        target: featureNodeId,
        style: { strokeDasharray: '5 5' },
      });
    });
  }

  // Use dagre LR layout for compact, automatic positioning
  const laid = layoutWithDagre(nodes, edges, {
    direction: 'LR',
    ranksep: 200,
    nodesep: 15,
  });

  // Position "+ Add Repository" below the last repo node (no-features case) or
  // vertically centered with a bottom feature node (features case).
  const repoNodes = laid.nodes.filter((n) => n.type === 'repositoryNode');
  const featureNodes = laid.nodes.filter((n) => n.type === 'featureNode');
  const repoX = repoNodes[0]?.position.x ?? 0;

  let addRepoPosition: { x: number; y: number };
  if (featureNodes.length > 0) {
    // Mirror how dagre centers repo nodes with their connected features
    const sortedFeatures = [...featureNodes].sort((a, b) => a.position.y - b.position.y);
    const centerIdx = Math.floor(sortedFeatures.length / 2);
    const targetFeature =
      sortedFeatures[centerIdx + 1] ?? sortedFeatures[sortedFeatures.length - 1];
    // Center the add-repo node (h=50) with the target feature node (h=140)
    addRepoPosition = { x: repoX, y: targetFeature.position.y + 70 - 25 };
  } else {
    // No features — place below the bottom-most repo node with a gap
    const lastRepoY = repoNodes.length > 0 ? Math.max(...repoNodes.map((n) => n.position.y)) : 0;
    const repoHeight = 50;
    const gap = 200;
    addRepoPosition = { x: repoX, y: lastRepoY + repoHeight + gap };
  }

  laid.nodes.push({
    id: 'add-repository',
    type: 'addRepositoryNode',
    position: addRepoPosition,
    data: {},
  } as CanvasNodeType);

  return (
    <div className="h-screen w-full">
      <ControlCenter initialNodes={laid.nodes} initialEdges={laid.edges} />
    </div>
  );
}
