/**
 * derive-graph.ts
 *
 * Pure client-side derivation: domain Maps → React Flow nodes + edges.
 * All edges are derived from domain relationships (repositoryPath matching,
 * parentNodeId) — never stored independently.
 */

import type { Edge } from '@xyflow/react';
import type { CanvasNodeType } from '@/components/features/features-canvas';
import type { FeatureNodeData } from '@/components/common/feature-node';
import type { RepositoryNodeData } from '@/components/common/repository-node';
/** A feature node entry stored in the domain Map. */
export interface FeatureEntry {
  nodeId: string;
  data: FeatureNodeData;
  /** If set, this feature connects to a parent feature via a dependency edge (no repo→feature edge). */
  parentNodeId?: string;
}

/** A repository node entry stored in the domain Map. */
export interface RepoEntry {
  nodeId: string;
  data: RepositoryNodeData;
}

/** Stable callbacks passed by the consumer, injected into derived node data. */
export interface GraphCallbacks {
  /** Called when the user triggers an action on a feature node (e.g., adds a sub-feature). */
  onNodeAction?: (nodeId: string) => void;
  /** Called when the user opens settings/details on a feature node. */
  onNodeSettings?: (nodeId: string) => void;
  /** Called when the user deletes a feature. */
  onFeatureDelete?: (featureId: string) => void;
  /** Called when the user clicks the "+" add-feature button on a repo node. */
  onRepositoryAdd?: (repoNodeId: string) => void;
  /** Called when the user clicks a repo node to navigate to its detail page. */
  onRepositoryClick?: (repoNodeId: string) => void;
  /** Called when the user deletes a repository. */
  onRepositoryDelete?: (repositoryId: string) => void;
}

/**
 * Derives React Flow nodes and edges from domain Maps.
 *
 * - Feature nodes without a parentNodeId → repo→feature edge (matched by repositoryPath)
 * - Feature nodes without a parentNodeId but with no matching repo → virtual repo node
 * - Feature nodes with a parentNodeId → dependency edge (parentNodeId→nodeId)
 * - Pending feature nodes (creating state) from pendingMap → same rules, no action callbacks
 * - Callbacks are injected into node data via closures
 */
export function deriveGraph(
  featureMap: Map<string, FeatureEntry>,
  repoMap: Map<string, RepoEntry>,
  pendingMap: Map<string, FeatureEntry>,
  callbacks?: GraphCallbacks
): { nodes: CanvasNodeType[]; edges: Edge[] } {
  const nodes: CanvasNodeType[] = [];
  const edges: Edge[] = [];

  // Build a lookup: repositoryPath → repoNodeId
  const repoByPath = new Map<string, string>();
  for (const [nodeId, entry] of repoMap) {
    if (entry.data.repositoryPath) {
      repoByPath.set(entry.data.repositoryPath, nodeId);
    }
  }

  // Virtual repo nodes created for orphaned features (not in repoMap)
  const virtualRepos = new Map<string, string>(); // path → virtualNodeId

  function getOrCreateVirtualRepo(repositoryPath: string): string {
    if (virtualRepos.has(repositoryPath)) {
      return virtualRepos.get(repositoryPath)!;
    }
    const virtualId = `virtual-repo-${repositoryPath}`;
    const repoName = repositoryPath.split('/').filter(Boolean).at(-1) ?? repositoryPath;
    nodes.push({
      id: virtualId,
      type: 'repositoryNode',
      position: { x: 0, y: 0 },
      data: { name: repoName, repositoryPath } satisfies RepositoryNodeData,
    } as CanvasNodeType);
    virtualRepos.set(repositoryPath, virtualId);
    return virtualId;
  }

  // Add repo nodes (real ones)
  for (const [nodeId, entry] of repoMap) {
    const data: RepositoryNodeData = {
      ...entry.data,
      ...(callbacks?.onRepositoryAdd && {
        onAdd: () => callbacks.onRepositoryAdd!(nodeId),
      }),
      ...(callbacks?.onRepositoryClick && {
        onClick: () => callbacks.onRepositoryClick!(nodeId),
      }),
      ...(callbacks?.onRepositoryDelete && {
        onDelete: callbacks.onRepositoryDelete,
      }),
    };
    nodes.push({
      id: nodeId,
      type: 'repositoryNode',
      position: { x: 0, y: 0 },
      data,
    } as CanvasNodeType);
  }

  // Process feature entries (both real and pending).
  // Skip pendingMap entries that already exist in featureMap (reconcile may not
  // have cleaned them up yet if the AI-generated name differs from the original).
  const allFeatureEntries: [string, FeatureEntry, boolean][] = [
    ...[...featureMap.entries()].map(
      ([id, e]) => [id, e, false] as [string, FeatureEntry, boolean]
    ),
    ...[...pendingMap.entries()]
      .filter(([id]) => !featureMap.has(id))
      .map(([id, e]) => [id, e, true] as [string, FeatureEntry, boolean]),
  ];

  for (const [nodeId, entry, isPending] of allFeatureEntries) {
    const isCreating = entry.data.state === 'creating' || isPending;

    const data: FeatureNodeData = {
      ...entry.data,
      // Callbacks only for non-creating nodes
      ...(!isCreating &&
        callbacks?.onNodeAction && {
          onAction: () => callbacks.onNodeAction!(nodeId),
        }),
      ...(!isCreating &&
        callbacks?.onNodeSettings && {
          onSettings: () => callbacks.onNodeSettings!(nodeId),
        }),
      ...(!isCreating &&
        callbacks?.onFeatureDelete && {
          onDelete: callbacks.onFeatureDelete,
        }),
    };

    nodes.push({
      id: nodeId,
      type: 'featureNode',
      position: { x: 0, y: 0 },
      data,
    } as CanvasNodeType);

    // Edge derivation
    if (entry.parentNodeId) {
      // Dependency edge (parent→child feature)
      edges.push({
        id: `dep-${entry.parentNodeId}-${nodeId}`,
        source: entry.parentNodeId,
        target: nodeId,
        type: 'dependencyEdge',
      });
    } else {
      // Repo→feature edge (matched by repositoryPath)
      const repositoryPath = entry.data.repositoryPath;
      const repoNodeId = repoByPath.get(repositoryPath) ?? getOrCreateVirtualRepo(repositoryPath);
      edges.push({
        id: `edge-${repoNodeId}-${nodeId}`,
        source: repoNodeId,
        target: nodeId,
        style: { strokeDasharray: '5 5' },
      });
    }
  }

  // Inject showHandles based on whether there are any edges
  const hasEdges = edges.length > 0;
  for (const node of nodes) {
    (node.data as Record<string, unknown>).showHandles = hasEdges;
  }

  return { nodes, edges };
}
