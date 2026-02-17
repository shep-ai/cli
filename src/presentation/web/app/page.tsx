import { ControlCenter } from '@/components/features/control-center';
import { getAgentRun, getFeatures } from '@shepai/core/infrastructure/di/use-cases-bridge';
import { deriveState } from './derive-state';
import { layoutWithDagre } from '@/lib/layout-with-dagre';
import type { CanvasNodeType } from '@/components/features/features-canvas';
import type { Edge } from '@xyflow/react';
import type { FeatureNodeData, FeatureLifecyclePhase } from '@/components/common/feature-node';

/** Force request-time rendering so the globalThis DI bridge is available. */
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
};

export default async function HomePage() {
  const features = await getFeatures();
  const featuresWithRuns = await Promise.all(
    features.map(async (feature) => {
      const run = feature.agentRunId ? await getAgentRun(feature.agentRunId) : null;
      return {
        feature,
        agentStatus: run?.status,
        agentError: run?.error,
        agentResult: run?.result,
      };
    })
  );

  // Group features by repository path
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

  Object.entries(featuresByRepo).forEach(([repoPath, repoFeatures]) => {
    const repoNodeId = `repo-${repoPath}`;
    const repoName = repoPath.split('/').pop() ?? repoPath;
    nodes.push({
      id: repoNodeId,
      type: 'repositoryNode',
      position: { x: 0, y: 0 },
      data: { name: repoName },
    });

    repoFeatures.forEach(({ feature, agentStatus, agentError, agentResult }) => {
      const agentNode = agentResult?.startsWith('node:') ? agentResult.slice(5) : undefined;
      const lifecycle: FeatureLifecyclePhase =
        agentStatus === 'completed'
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
        ...deriveState(lifecycle, agentStatus),
        ...(agentError && { errorMessage: agentError }),
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
  });

  // Use dagre LR layout for compact, automatic positioning
  const laid = layoutWithDagre(nodes, edges, {
    direction: 'LR',
    ranksep: 60,
    nodesep: 20,
  });

  return (
    <div className="h-screen w-full">
      <ControlCenter initialNodes={laid.nodes} initialEdges={laid.edges} />
    </div>
  );
}
