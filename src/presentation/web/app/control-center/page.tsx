import { ControlCenter } from '@/components/features/control-center';
import { getFeatures } from '@/lib/features';
import type { CanvasNodeType } from '@/components/features/features-canvas';
import type { Edge } from '@xyflow/react';
import type { FeatureNodeData, FeatureLifecyclePhase } from '@/components/common/feature-node';

/** Map domain SdlcLifecycle enum values to UI FeatureLifecyclePhase. */
const lifecycleMap: Record<string, FeatureLifecyclePhase> = {
  Requirements: 'requirements',
  Research: 'requirements',
  Implementation: 'implementation',
  Review: 'test',
  'Deploy & QA': 'deploy',
  Maintain: 'deploy',
};

export default async function ControlCenterPage() {
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

  let yOffset = 50;

  Object.entries(featuresByRepo).forEach(([repoPath, repoFeatures]) => {
    const repoNodeId = `repo-${repoPath}`;
    const repoName = repoPath.split('/').pop() ?? repoPath;
    nodes.push({
      id: repoNodeId,
      type: 'repositoryNode',
      position: { x: 50, y: yOffset + (repoFeatures.length * 150) / 2 },
      data: { name: repoName },
    });

    repoFeatures.forEach((feature, index) => {
      const lifecycle = lifecycleMap[feature.lifecycle] ?? 'requirements';

      const nodeData: FeatureNodeData = {
        name: feature.name,
        description: feature.description ?? feature.slug,
        featureId: feature.id,
        lifecycle,
        state: 'running',
        progress: 0,
      };

      const featureNodeId = `feat-${feature.id}`;
      nodes.push({
        id: featureNodeId,
        type: 'featureNode',
        position: { x: 400, y: yOffset + index * 200 },
        data: nodeData,
      });

      edges.push({
        id: `edge-${repoNodeId}-${featureNodeId}`,
        source: repoNodeId,
        target: featureNodeId,
        style: { strokeDasharray: '5 5' },
      });
    });

    yOffset += Math.max(repoFeatures.length * 200, 200) + 100;
  });

  return (
    <div className="h-screen w-full">
      <ControlCenter initialNodes={nodes} initialEdges={edges} />
    </div>
  );
}
