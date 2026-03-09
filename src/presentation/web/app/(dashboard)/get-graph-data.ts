import { resolve } from '@/lib/server-container';
import type { ListFeaturesUseCase } from '@shepai/core/application/use-cases/features/list-features.use-case';
import type { ListRepositoriesUseCase } from '@shepai/core/application/use-cases/repositories/list-repositories.use-case';
import type { IAgentRunRepository } from '@shepai/core/application/ports/output/agents/agent-run-repository.interface';
import type { IDeploymentService } from '@shepai/core/application/ports/output/services/deployment-service.interface';
import { layoutWithDagre, CANVAS_LAYOUT_DEFAULTS } from '@/lib/layout-with-dagre';
import { buildGraphNodes } from '@/app/build-graph-nodes';
import type { CanvasNodeType } from '@/components/features/features-canvas';
import type { FeatureNodeData } from '@/components/common/feature-node';
import type { Edge } from '@xyflow/react';

export async function getGraphData(): Promise<{ nodes: CanvasNodeType[]; edges: Edge[] }> {
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

  const { nodes, edges } = buildGraphNodes(repositories, featuresWithRuns);

  // Enrich feature nodes with deployment status
  let deploymentService: IDeploymentService | null = null;
  try {
    deploymentService = resolve<IDeploymentService>('IDeploymentService');
  } catch {
    // Deployment service may not be registered — skip enrichment
  }

  if (deploymentService) {
    for (const node of nodes) {
      if (node.type !== 'featureNode') continue;
      const data = node.data as FeatureNodeData;
      const status = deploymentService.getStatus(data.featureId);
      if (status && status.state !== 'Stopped') {
        data.deployment = {
          status: status.state,
          ...(status.url && { url: status.url }),
        };
      }
    }
  }

  return layoutWithDagre(nodes, edges, CANVAS_LAYOUT_DEFAULTS);
}
