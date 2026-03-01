import { ControlCenter } from '@/components/features/control-center';
import { resolve } from '@/lib/server-container';
import type { ListFeaturesUseCase } from '@shepai/core/application/use-cases/features/list-features.use-case';
import type { ListRepositoriesUseCase } from '@shepai/core/application/use-cases/repositories/list-repositories.use-case';
import type { IAgentRunRepository } from '@shepai/core/application/ports/output/agents/agent-run-repository.interface';
import { layoutWithDagre } from '@/lib/layout-with-dagre';
import { buildGraphNodes } from '@/app/build-graph-nodes';

/** Skip static pre-rendering since we need runtime DI container and server context. */
export const dynamic = 'force-dynamic';

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

  const { nodes, edges } = buildGraphNodes(repositories, featuresWithRuns);

  // Use dagre LR layout for compact, automatic positioning
  const laid = layoutWithDagre(nodes, edges, {
    direction: 'LR',
    ranksep: 200,
    nodesep: 15,
  });

  return (
    <div className="h-screen w-full">
      <ControlCenter
        initialNodes={laid.nodes}
        initialEdges={laid.edges}
        featuresWithRuns={featuresWithRuns}
      />
    </div>
  );
}
