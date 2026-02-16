import { ControlCenter } from '@/components/features/control-center';
import { getFeatures } from '@/lib/use-cases';
import { layoutWithDagre } from '@/lib/layout-with-dagre';
import {
  deriveNodeState,
  deriveProgress,
} from '@/components/common/feature-node/derive-feature-state';
import type { CanvasNodeType } from '@/components/features/features-canvas';
import type { Edge } from '@xyflow/react';
import type { FeatureNodeData, FeatureLifecyclePhase } from '@/components/common/feature-node';

/** Map domain SdlcLifecycle enum values to UI FeatureLifecyclePhase (1:1). */
const lifecycleMap: Record<string, FeatureLifecyclePhase> = {
  Requirements: 'requirements',
  Research: 'research',
  Implementation: 'implementation',
  Review: 'review',
  'Deploy & QA': 'deploy',
  Maintain: 'maintain',
};

export default async function HomePage() {
  const features = await getFeatures();

  // Group features by repository path
  const featuresByRepo: Record<string, typeof features> = {};
  features.forEach((f) => {
    const repoKey = f.repositoryPath;
    if (!featuresByRepo[repoKey]) {
      featuresByRepo[repoKey] = [];
    }
    featuresByRepo[repoKey].push(f);
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

    repoFeatures.forEach((feature) => {
      const lifecycle: FeatureLifecyclePhase = lifecycleMap[feature.lifecycle] ?? 'requirements';

      const nodeData: FeatureNodeData = {
        name: feature.name,
        description: feature.description ?? feature.slug,
        featureId: feature.id,
        lifecycle,
        state: deriveNodeState(feature),
        progress: deriveProgress(feature),
        ...(feature.agentRunId && { agentType: 'claude-code' as FeatureNodeData['agentType'] }),
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
