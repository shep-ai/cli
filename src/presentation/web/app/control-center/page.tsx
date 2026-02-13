import { ControlCenter } from '@/components/features/control-center';
import { getGlobalFeatures } from '@/lib/shep-data';
import type { CanvasNodeType } from '@/components/features/features-canvas';
import type { Edge } from '@xyflow/react';
import type {
  FeatureNodeData,
  FeatureLifecyclePhase,
  FeatureNodeState,
} from '@/components/common/feature-node';

export default async function ControlCenterPage() {
  const globalFeatures = await getGlobalFeatures();

  // Group features by repository
  const featuresByRepo: Record<string, typeof globalFeatures> = {};
  globalFeatures.forEach((gf) => {
    if (!featuresByRepo[gf.repoId]) {
      featuresByRepo[gf.repoId] = [];
    }
    featuresByRepo[gf.repoId].push(gf);
  });

  const nodes: CanvasNodeType[] = [];
  const edges: Edge[] = [];

  let yOffset = 50;

  // Process each repository
  Object.entries(featuresByRepo).forEach(([repoId, features]) => {
    // Create Repository Node
    const repoNodeId = `repo-${repoId}`;
    nodes.push({
      id: repoNodeId,
      type: 'repositoryNode',
      position: { x: 50, y: yOffset + (features.length * 150) / 2 }, // Center vertically relative to its features
      data: {
        name: repoId.substring(0, 8), // Display short hash/ID
      },
    });

    // Create Feature Nodes for this repo
    features.forEach((gf, index) => {
      let state: FeatureNodeState = 'running';
      if (gf.status?.phase === 'complete') state = 'done';
      if (gf.status?.phase === 'blocked') state = 'blocked';

      const lifecycle = (gf.feature.lifecycle as FeatureLifecyclePhase) || 'requirements';

      const nodeData: FeatureNodeData = {
        name: gf.feature.name,
        description: gf.feature.description ?? gf.feature.id,
        featureId: gf.feature.id,
        lifecycle,
        state,
        progress: gf.status?.progress?.percentage ?? 0,
      };

      const featureNodeId = `feat-${repoId}-${gf.feature.id}`;
      nodes.push({
        id: featureNodeId,
        type: 'featureNode',
        position: { x: 400, y: yOffset + index * 200 },
        data: nodeData,
      });

      // Connect Repo to Feature
      edges.push({
        id: `edge-${repoNodeId}-${featureNodeId}`,
        source: repoNodeId,
        target: featureNodeId,
        style: { strokeDasharray: '5 5' },
      });
    });

    // Increment Y offset for next repo block
    yOffset += Math.max(features.length * 200, 200) + 100;
  });

  return (
    <div className="h-screen w-full">
      <ControlCenter initialNodes={nodes} initialEdges={edges} />
    </div>
  );
}
