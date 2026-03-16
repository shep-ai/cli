import { execFile as execFileCb } from 'node:child_process';
import { promisify } from 'node:util';
import { resolve } from '@/lib/server-container';
import type { ListFeaturesUseCase } from '@shepai/core/application/use-cases/features/list-features.use-case';
import type { ListRepositoriesUseCase } from '@shepai/core/application/use-cases/repositories/list-repositories.use-case';
import type { IAgentRunRepository } from '@shepai/core/application/ports/output/agents/agent-run-repository.interface';
import type { IGitPrService } from '@shepai/core/application/ports/output/services/git-pr-service.interface';
import type { IFeatureRepository } from '@shepai/core/application/ports/output/repositories/feature-repository.interface';
import type { IDeploymentService } from '@shepai/core/application/ports/output/services/deployment-service.interface';
import type { Repository } from '@shepai/core/domain/generated/output';
import { CiStatus } from '@shepai/core/domain/generated/output';
import { getSettings } from '@shepai/core/infrastructure/services/settings.service';
import { layoutWithDagre, CANVAS_LAYOUT_DEFAULTS } from '@/lib/layout-with-dagre';
import { buildGraphNodes } from '@/app/build-graph-nodes';
import type { CanvasNodeType } from '@/components/features/features-canvas';
import type { FeatureNodeData } from '@/components/common/feature-node';
import type { Edge } from '@xyflow/react';

const execFileAsync = promisify(execFileCb);

export interface RepoGitInfo {
  branch: string;
  commitHash: string;
  behindCount: number | null;
}

async function gitCommand(cwd: string, args: string[]): Promise<string | null> {
  try {
    const { stdout } = await execFileAsync('git', args, { cwd });
    return stdout.trim();
  } catch {
    return null;
  }
}

async function fetchRepoGitInfo(repo: Repository): Promise<RepoGitInfo | null> {
  try {
    const [currentBranch, commitHash] = await Promise.all([
      gitCommand(repo.path, ['symbolic-ref', '--short', 'HEAD']),
      gitCommand(repo.path, ['rev-parse', '--short', 'HEAD']),
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
      commitHash: commitHash ?? 'unknown',
      behindCount,
    };
  } catch {
    return null;
  }
}

const CI_STATUS_MAP: Record<string, CiStatus> = {
  success: CiStatus.Success,
  failure: CiStatus.Failure,
  pending: CiStatus.Pending,
};

export async function getGraphData(): Promise<{ nodes: CanvasNodeType[]; edges: Edge[] }> {
  const listFeatures = resolve<ListFeaturesUseCase>('ListFeaturesUseCase');
  const listRepos = resolve<ListRepositoriesUseCase>('ListRepositoriesUseCase');
  const agentRunRepo = resolve<IAgentRunRepository>('IAgentRunRepository');
  const gitPrService = resolve<IGitPrService>('IGitPrService');
  const featureRepo = resolve<IFeatureRepository>('IFeatureRepository');

  const [features, repositories] = await Promise.all([listFeatures.execute(), listRepos.execute()]);

  // Fetch git info (branch, commit, behind count) for each repository
  const repoGitInfoMap = new Map<string, RepoGitInfo>();
  await Promise.all(
    repositories.map(async (repo) => {
      const info = await fetchRepoGitInfo(repo);
      if (info) repoGitInfoMap.set(repo.path, info);
    })
  );

  // Fetch live PR status for features with open PRs so the canvas
  // reflects the current GitHub state without waiting for the background watcher.
  await Promise.all(
    features
      .filter((f) => f.pr?.number)
      .map(async (feature) => {
        try {
          const updates: Record<string, unknown> = {};

          // Live mergeable status (only if not yet known)
          if (feature.pr!.mergeable === undefined) {
            const mergeable = await gitPrService.getMergeableStatus(
              feature.repositoryPath,
              feature.pr!.number
            );
            if (mergeable !== undefined) updates.mergeable = mergeable;
          }

          // Live CI status
          if (feature.branch) {
            const ciResult = await gitPrService
              .getCiStatus(feature.repositoryPath, feature.branch)
              .catch(() => undefined);
            if (ciResult) {
              const ciStatus = CI_STATUS_MAP[ciResult.status] ?? CiStatus.Pending;
              if (ciStatus !== feature.pr!.ciStatus) updates.ciStatus = ciStatus;
            }
          }

          if (Object.keys(updates).length > 0) {
            feature.pr = { ...feature.pr!, ...updates };
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
