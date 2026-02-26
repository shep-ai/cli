import type { Feature, Repository, AgentRun } from '@shepai/core/domain/generated/output';
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

/** Map agent graph node names (from agent_run.result) to UI lifecycle phases. */
const nodeToLifecyclePhase: Record<string, FeatureLifecyclePhase> = {
  analyze: 'requirements',
  requirements: 'requirements',
  research: 'research',
  plan: 'implementation',
  implement: 'implementation',
  merge: 'review',
};

export interface FeatureWithRun {
  feature: Feature;
  run: AgentRun | null;
}

/**
 * Builds React Flow nodes and edges from persisted repositories and features.
 *
 * Features whose repositoryPath is not covered by any real repository row are
 * grouped under a synthetic "virtual" repository node
 * (id: `virtual-repo-${repositoryPath}`). This ensures the dashboard never
 * renders empty when features exist but their repository rows are missing.
 */
export function buildGraphNodes(
  repositories: Repository[],
  featuresWithRuns: FeatureWithRun[]
): { nodes: CanvasNodeType[]; edges: Edge[] } {
  // Group features by repository path
  const featuresByRepo: Record<string, FeatureWithRun[]> = {};
  featuresWithRuns.forEach((entry) => {
    const repoKey = entry.feature.repositoryPath;
    if (!featuresByRepo[repoKey]) {
      featuresByRepo[repoKey] = [];
    }
    featuresByRepo[repoKey].push(entry);
  });

  const nodes: CanvasNodeType[] = [];
  const edges: Edge[] = [];

  // Track which repository paths have been rendered (to avoid orphan duplicates)
  const coveredPaths = new Set<string>();

  // First, add nodes for all persisted repositories (including those without features)
  for (const repo of repositories) {
    coveredPaths.add(repo.path);
    const repoNodeId = `repo-${repo.id}`;
    nodes.push({
      id: repoNodeId,
      type: 'repositoryNode',
      position: { x: 0, y: 0 },
      data: { name: repo.name, repositoryPath: repo.path, id: repo.id },
    });

    const repoFeatures = featuresByRepo[repo.path] ?? [];
    appendFeatureNodes(repoFeatures, repoNodeId, featuresWithRuns, nodes, edges);
  }

  // Second pass: group orphaned features under virtual repository nodes
  for (const [repoPath, orphanFeatures] of Object.entries(featuresByRepo)) {
    if (coveredPaths.has(repoPath)) continue;

    const virtualRepoNodeId = `virtual-repo-${repoPath}`;
    const repoName = repoPath.split('/').filter(Boolean).at(-1) ?? repoPath;
    nodes.push({
      id: virtualRepoNodeId,
      type: 'repositoryNode',
      position: { x: 0, y: 0 },
      data: { name: repoName, repositoryPath: repoPath },
    });

    appendFeatureNodes(orphanFeatures, virtualRepoNodeId, featuresWithRuns, nodes, edges);
  }

  // Add parent→child dependency edges
  for (const { feature } of featuresWithRuns) {
    if (feature.parentId) {
      const parentNodeId = `feat-${feature.parentId}`;
      const childNodeId = `feat-${feature.id}`;
      if (nodes.some((n) => n.id === parentNodeId) && nodes.some((n) => n.id === childNodeId)) {
        edges.push({
          id: `dep-${parentNodeId}-${childNodeId}`,
          source: parentNodeId,
          target: childNodeId,
          type: 'dependencyEdge',
        });
      }
    }
  }

  return { nodes, edges };
}

function appendFeatureNodes(
  repoFeatures: FeatureWithRun[],
  repoNodeId: string,
  allFeaturesWithRuns: FeatureWithRun[],
  nodes: CanvasNodeType[],
  edges: Edge[]
): void {
  repoFeatures.forEach(({ feature, run }) => {
    const agentNode = run?.result?.startsWith('node:') ? run.result.slice(5) : undefined;
    const lifecycle: FeatureLifecyclePhase =
      run?.status === 'completed'
        ? 'maintain'
        : ((agentNode ? nodeToLifecyclePhase[agentNode] : undefined) ??
          lifecycleMap[feature.lifecycle] ??
          'requirements');

    // Resolve blockedBy display name from parent feature
    let blockedBy: string | undefined;
    if (feature.parentId && feature.lifecycle === 'Blocked') {
      const parentEntry = allFeaturesWithRuns.find((e) => e.feature.id === feature.parentId);
      if (parentEntry) {
        blockedBy = parentEntry.feature.name;
      }
    }

    const nodeData: FeatureNodeData = {
      name: feature.name,
      description: feature.description ?? feature.slug,
      featureId: feature.id,
      lifecycle,
      repositoryPath: feature.repositoryPath,
      branch: feature.branch,
      specPath: feature.specPath,
      state: deriveNodeState(feature, run),
      progress: deriveProgress(feature),
      ...(run?.agentType && { agentType: run.agentType as FeatureNodeData['agentType'] }),
      ...(run?.error && { errorMessage: run.error }),
      ...(blockedBy && { blockedBy }),
      ...(feature.pr && {
        pr: {
          url: feature.pr.url,
          number: feature.pr.number,
          status: feature.pr.status,
          ciStatus: feature.pr.ciStatus,
          commitHash: feature.pr.commitHash,
        },
      }),
    };

    const featureNodeId = `feat-${feature.id}`;
    nodes.push({
      id: featureNodeId,
      type: 'featureNode',
      position: { x: 0, y: 0 },
      data: nodeData,
    });

    // Child features connect via parent→child dependency edge, not directly to repo
    if (!feature.parentId) {
      edges.push({
        id: `edge-${repoNodeId}-${featureNodeId}`,
        source: repoNodeId,
        target: featureNodeId,
        style: { strokeDasharray: '5 5' },
      });
    }
  });
}
