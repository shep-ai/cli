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

      // Resolve blockedBy display name from parent feature
      let blockedBy: string | undefined;
      if (feature.parentId && feature.lifecycle === 'Blocked') {
        const parentEntry = featuresWithRuns.find((e) => e.feature.id === feature.parentId);
        if (parentEntry) {
          blockedBy = parentEntry.feature.name;
        }
      }

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
        ...(blockedBy && { blockedBy }),
        ...(feature.pr && {
          pr: {
            url: feature.pr.url,
            number: feature.pr.number,
            status: feature.pr.status,
            ciStatus: feature.pr.ciStatus,
            commitHash: feature.pr.commitHash,
          },
        }),
      };

      const featureNodeId = `feat-${feature.id}`;
      nodes.push({
        id: featureNodeId,
        type: 'featureNode',
        position: { x: 0, y: 0 },
        data: nodeData,
      });

      // Child features connect via parent→child dependency edge, not directly to repo
      if (!feature.parentId) {
        edges.push({
          id: `edge-${repoNodeId}-${featureNodeId}`,
          source: repoNodeId,
          target: featureNodeId,
          style: { strokeDasharray: '5 5' },
        });
      }
    });
  }

  // Add parent→child dependency edges
  for (const { feature } of featuresWithRuns) {
    if (feature.parentId) {
      const parentNodeId = `feat-${feature.parentId}`;
      const childNodeId = `feat-${feature.id}`;
      // Only add edge if both nodes exist on the canvas
      if (nodes.some((n) => n.id === parentNodeId) && nodes.some((n) => n.id === childNodeId)) {
        edges.push({
          id: `dep-${parentNodeId}-${childNodeId}`,
          source: parentNodeId,
          target: childNodeId,
          type: 'dependencyEdge',
        });
      }
    }
  }

  // Use dagre LR layout for compact, automatic positioning
  const laid = layoutWithDagre(nodes, edges, {
    direction: 'LR',
    ranksep: 200,
    nodesep: 15,
  });

  return (
    <div className="h-screen w-full">
      <ControlCenter initialNodes={laid.nodes} initialEdges={laid.edges} />
    </div>
  );
}
