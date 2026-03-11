import { resolve } from '@/lib/server-container';
import type { ListFeaturesUseCase } from '@shepai/core/application/use-cases/features/list-features.use-case';
import type { ListRepositoriesUseCase } from '@shepai/core/application/use-cases/repositories/list-repositories.use-case';
import type { IAgentRunRepository } from '@shepai/core/application/ports/output/agents/agent-run-repository.interface';
import type { IGitPrService } from '@shepai/core/application/ports/output/services/git-pr-service.interface';
import type { IFeatureRepository } from '@shepai/core/application/ports/output/repositories/feature-repository.interface';
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
  const gitPrService = resolve<IGitPrService>('IGitPrService');
  const featureRepo = resolve<IFeatureRepository>('IFeatureRepository');

  const [features, repositories] = await Promise.all([listFeatures.execute(), listRepos.execute()]);

  // Fetch live mergeable status for features with open PRs so the canvas
  // reflects the current GitHub state without waiting for the background watcher.
  await Promise.all(
    features
      .filter((f) => f.pr?.number && f.pr.mergeable === undefined)
      .map(async (feature) => {
        try {
          const mergeable = await gitPrService.getMergeableStatus(
            feature.repositoryPath,
            feature.pr!.number
          );
          if (mergeable !== undefined) {
            feature.pr = { ...feature.pr!, mergeable };
            featureRepo.update(feature).catch(() => {
              /* best-effort persist */
            });
          }
        } catch {
          // GitHub fetch failed — use cached value
        }
      })
  );

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
