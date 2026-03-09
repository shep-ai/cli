'use client';

import { useMemo, useRef } from 'react';
import type { Edge, Position } from '@xyflow/react';
import type { CanvasNodeType } from '@/components/features/features-canvas';
import type { FeatureNodeData } from '@/components/common/feature-node';
import type { RepositoryNodeData } from '@/components/common/repository-node';
import {
  deriveGraph,
  type FeatureEntry,
  type RepoEntry,
  type GraphCallbacks,
} from '@/lib/derive-graph';
import { layoutWithDagre, CANVAS_LAYOUT_DEFAULTS } from '@/lib/layout-with-dagre';

export type { GraphCallbacks } from '@/lib/derive-graph';

export interface GraphDerivedState {
  /** Derived React Flow nodes (from domain Maps). */
  nodes: CanvasNodeType[];
  /** Derived React Flow edges (from domain Maps). */
  edges: Edge[];
}

/** Parse server nodes + edges into domain Maps. */
export function parseMaps(
  serverNodes: CanvasNodeType[],
  serverEdges: Edge[]
): {
  featureMap: Map<string, FeatureEntry>;
  repoMap: Map<string, RepoEntry>;
} {
  // Build parentNodeId map from dependency edges
  const parentByChild = new Map<string, string>();
  for (const edge of serverEdges) {
    if (edge.type === 'dependencyEdge') {
      parentByChild.set(edge.target, edge.source);
    }
  }

  const featureMap = new Map<string, FeatureEntry>();
  const repoMap = new Map<string, RepoEntry>();

  for (const node of serverNodes) {
    if (node.type === 'featureNode') {
      featureMap.set(node.id, {
        nodeId: node.id,
        data: node.data as FeatureNodeData,
        parentNodeId: parentByChild.get(node.id),
      });
    } else if (node.type === 'repositoryNode') {
      repoMap.set(node.id, {
        nodeId: node.id,
        data: node.data as RepositoryNodeData,
      });
    }
  }

  return { featureMap, repoMap };
}

/**
 * Pure derivation hook: domain Maps + pending state + callbacks → React Flow nodes/edges.
 *
 * This hook does NOT manage any server or UI state. It takes parsed Maps as input
 * and produces derived, laid-out React Flow nodes and edges.
 */
export function useGraphDerivedState(
  featureMap: Map<string, FeatureEntry>,
  repoMap: Map<string, RepoEntry>,
  pendingMap: Map<string, FeatureEntry>,
  callbacks: GraphCallbacks
): GraphDerivedState {
  // Derive graph from domain Maps (runs on every Map change, but dagre only on topology change)
  const derived = useMemo(
    () => deriveGraph(featureMap, repoMap, pendingMap, callbacks),
    [featureMap, repoMap, pendingMap, callbacks]
  );

  // Cache dagre layout positions — only re-run when node set or edge connections change
  const layoutCacheRef = useRef<{
    key: string;
    positions: Map<
      string,
      { position: { x: number; y: number }; targetPosition: Position; sourcePosition: Position }
    >;
  }>({ key: '', positions: new Map() });

  const { nodes, edges } = useMemo(() => {
    const nodeIds = derived.nodes
      .map((n) => n.id)
      .sort()
      .join(',');
    const edgeKeys = derived.edges
      .map((e) => `${e.source}-${e.target}`)
      .sort()
      .join(',');
    const topologyKey = `${nodeIds}|${edgeKeys}`;

    if (topologyKey !== layoutCacheRef.current.key) {
      // Topology changed — re-run dagre
      const result = layoutWithDagre(derived.nodes, derived.edges, CANVAS_LAYOUT_DEFAULTS);
      const positions = new Map<
        string,
        { position: { x: number; y: number }; targetPosition: Position; sourcePosition: Position }
      >();
      for (const node of result.nodes) {
        positions.set(node.id, {
          position: node.position,
          targetPosition: (node as Record<string, unknown>).targetPosition as Position,
          sourcePosition: (node as Record<string, unknown>).sourcePosition as Position,
        });
      }
      layoutCacheRef.current = { key: topologyKey, positions };
      return result;
    }

    // Data-only change — apply cached positions without re-running dagre
    const { positions } = layoutCacheRef.current;
    const nodes = derived.nodes.map((node) => {
      const cached = positions.get(node.id);
      return cached ? { ...node, ...cached } : node;
    });
    return { nodes, edges: derived.edges };
  }, [derived]);

  return { nodes, edges };
}
