import { ControlCenter } from '@/components/features/control-center';
import { getFeatures } from '@/lib/features';
import { type CanvasNodeType } from '@/components/features/features-canvas';
import { type Edge } from '@xyflow/react';
import {
  type FeatureNodeData,
  type FeatureLifecyclePhase,
  type FeatureNodeState,
} from '@/components/common/feature-node';

export default async function ControlCenterPage() {
  const features = await getFeatures();

  // Create Repository Node
  const repoNodeId = 'repo-root';
  const repoNode: CanvasNodeType = {
    id: repoNodeId,
    type: 'repositoryNode',
    position: { x: 50, y: 300 },
    data: {
      name: 'Current Repository',
    },
  };

  // Create Feature Nodes
  const featureNodes: CanvasNodeType[] = features.map((feature, index) => {
    // Map status/lifecycle to node state
    let state: FeatureNodeState = 'running';
    if (feature.status?.phase === 'complete') state = 'done';
    if (feature.status?.phase === 'blocked') state = 'blocked';
    // Default to 'running' for now as simple mapping

    const lifecycle = (feature.lifecycle as FeatureLifecyclePhase) || 'requirements';

    const nodeData: FeatureNodeData = {
      name: feature.name,
      description: feature.description ?? feature.id,
      featureId: feature.id,
      lifecycle,
      state,
      progress: feature.status?.progress?.percentage ?? 0,
    };

    return {
      id: feature.id,
      type: 'featureNode',
      position: { x: 400, y: 50 + index * 200 }, // Simple vertical stack layout
      data: nodeData,
    };
  });

  // Create Edges
  const edges: Edge[] = features.map((feature) => ({
    id: `edge-${repoNodeId}-${feature.id}`,
    source: repoNodeId,
    target: feature.id,
    style: { strokeDasharray: '5 5' },
  }));

  const initialNodes = [repoNode, ...featureNodes];
  const initialEdges = edges;

  return (
    <div className="h-screen w-full">
      <ControlCenter initialNodes={initialNodes} initialEdges={initialEdges} />
    </div>
  );
}
