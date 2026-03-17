import { execFile as execFileCb } from 'node:child_process';
import { promisify } from 'node:util';
import { IS_WINDOWS } from '@shepai/core/infrastructure/platform';
import { resolve } from '@/lib/server-container';
import type { ListFeaturesUseCase } from '@shepai/core/application/use-cases/features/list-features.use-case';
import type { ListRepositoriesUseCase } from '@shepai/core/application/use-cases/repositories/list-repositories.use-case';
import type { IAgentRunRepository } from '@shepai/core/application/ports/output/agents/agent-run-repository.interface';
import type { IDeploymentService } from '@shepai/core/application/ports/output/services/deployment-service.interface';
import type { Repository } from '@shepai/core/domain/generated/output';
import { getSettings } from '@shepai/core/infrastructure/services/settings.service';
import { layoutWithDagre, CANVAS_LAYOUT_DEFAULTS } from '@/lib/layout-with-dagre';
import { buildGraphNodes } from '@/app/build-graph-nodes';
import type { CanvasNodeType } from '@/components/features/features-canvas';
import type { FeatureNodeData } from '@/components/common/feature-node';
import type { Edge } from '@xyflow/react';

const execFileAsync = promisify(execFileCb);

export interface RepoGitInfo {
  branch: string;
  commitMessage: string;
  committer: string;
  behindCount: number | null;
}

async function gitCommand(cwd: string, args: string[]): Promise<string | null> {
  try {
    const opts = IS_WINDOWS ? { cwd, windowsHide: true } : { cwd };
    const { stdout } = await execFileAsync('git', args, opts);
    return stdout.trim();
  } catch {
    return null;
  }
}

export async function fetchRepoGitInfo(repo: Repository): Promise<RepoGitInfo | null> {
  try {
    const [currentBranch, commitMessage, committer] = await Promise.all([
      gitCommand(repo.path, ['symbolic-ref', '--short', 'HEAD']),
      gitCommand(repo.path, ['log', '-1', '--format=%s']),
      gitCommand(repo.path, ['log', '-1', '--format=%an']),
    ]);

    if (!currentBranch) return null;

    // Try to determine the default branch to compute behind count
    let behindCount: number | null = null;
    const defaultBranch = await gitCommand(repo.path, [
      'symbolic-ref',
      '--short',
      'refs/remotes/origin/HEAD',
    ]).then((ref) => ref?.replace('origin/', '') ?? null);

    if (defaultBranch && currentBranch !== defaultBranch) {
      const behind = await gitCommand(repo.path, [
        'rev-list',
        '--count',
        `${currentBranch}..origin/${defaultBranch}`,
      ]);
      behindCount = behind !== null ? parseInt(behind, 10) : null;
      if (isNaN(behindCount!)) behindCount = null;
    } else if (!defaultBranch || currentBranch === defaultBranch) {
      behindCount = 0;
    }

    return {
      branch: currentBranch,
      commitMessage: commitMessage ?? 'unknown',
      committer: committer ?? 'unknown',
      behindCount,
    };
  } catch {
    return null;
  }
}

export async function getGraphData(): Promise<{ nodes: CanvasNodeType[]; edges: Edge[] }> {
  const listFeatures = resolve<ListFeaturesUseCase>('ListFeaturesUseCase');
  const listRepos = resolve<ListRepositoriesUseCase>('ListRepositoriesUseCase');
  const agentRunRepo = resolve<IAgentRunRepository>('IAgentRunRepository');

  const [features, repositories] = await Promise.all([listFeatures.execute(), listRepos.execute()]);

  // Fetch git info (branch, commit, behind count) for each repository
  const repoGitInfoMap = new Map<string, RepoGitInfo>();
  await Promise.all(
    repositories.map(async (repo) => {
      const info = await fetchRepoGitInfo(repo);
      if (info) repoGitInfoMap.set(repo.path, info);
    })
  );

  // PR/CI status is kept fresh by PrSyncWatcher (30s background poll).
  // No live GitHub calls here — use cached DB values for fast response.

  const featuresWithRuns = await Promise.all(
    features.map(async (feature) => {
      const run = feature.agentRunId ? await agentRunRepo.findById(feature.agentRunId) : null;
      return { feature, run };
    })
  );

  const { workflow } = getSettings();
  const { nodes, edges } = buildGraphNodes(repositories, featuresWithRuns, {
    enableEvidence: workflow.enableEvidence,
    commitEvidence: workflow.commitEvidence,
    ciWatchEnabled: workflow.ciWatchEnabled,
    repoGitInfo: repoGitInfoMap,
  });

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
