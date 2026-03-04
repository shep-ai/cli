import dagre from '@dagrejs/dagre';
import type { Edge, Node } from '@xyflow/react';

export type LayoutDirection = 'TB' | 'LR' | 'BT' | 'RL';

export interface LayoutOptions {
  /** Graph direction: top-bottom, left-right, etc. Default "TB" */
  direction?: LayoutDirection;
  /** Default node size when per-node size is unavailable */
  nodeSize?: { width: number; height: number };
  /** Vertical separation between ranks (default 80) */
  ranksep?: number;
  /** Horizontal separation between nodes in the same rank (default 30) */
  nodesep?: number;
}

/** Canonical layout defaults for the control-center canvas. */
export const CANVAS_LAYOUT_DEFAULTS: LayoutOptions = {
  direction: 'LR',
  ranksep: 200,
  nodesep: 15,
};

/** Known node-type dimensions for the canvas node types */
const NODE_DIMENSIONS: Record<string, { width: number; height: number }> = {
  featureNode: { width: 288, height: 140 },
  repositoryNode: { width: 288, height: 50 },
  addRepositoryNode: { width: 224, height: 50 },
};

function getNodeSize(
  node: Node,
  defaultSize: { width: number; height: number }
): { width: number; height: number } {
  // Prefer per-node size from data, then type-based lookup, then default
  const data = node.data as Record<string, unknown> | undefined;
  if (data && typeof data.width === 'number' && typeof data.height === 'number') {
    return { width: data.width, height: data.height };
  }
  return NODE_DIMENSIONS[node.type ?? ''] ?? defaultSize;
}

function getHandlePositions(direction: LayoutDirection) {
  switch (direction) {
    case 'LR':
      return { targetPosition: 'left' as const, sourcePosition: 'right' as const };
    case 'RL':
      return { targetPosition: 'right' as const, sourcePosition: 'left' as const };
    case 'BT':
      return { targetPosition: 'bottom' as const, sourcePosition: 'top' as const };
    case 'TB':
    default:
      return { targetPosition: 'top' as const, sourcePosition: 'bottom' as const };
  }
}

/**
 * Compute an automatic hierarchical layout for React Flow nodes and edges
 * using Dagre. Returns new node/edge arrays — never mutates the originals.
 *
 * Disconnected nodes (no edges) are placed below the laid-out graph
 * so they remain visible without overlapping.
 */
export function layoutWithDagre<N extends Node>(
  nodes: N[],
  edges: Edge[],
  opts: LayoutOptions = {}
): { nodes: N[]; edges: Edge[] } {
  const {
    direction = 'TB',
    nodeSize = { width: 172, height: 36 },
    ranksep = 80,
    nodesep = 30,
  } = opts;

  if (nodes.length === 0) {
    return { nodes: [], edges: [] };
  }

  const g = new dagre.graphlib.Graph({ multigraph: true });
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: direction, ranksep, nodesep });

  // Separate connected from disconnected nodes
  const connectedIds = new Set<string>();
  for (const edge of edges) {
    connectedIds.add(edge.source);
    connectedIds.add(edge.target);
  }

  const graphNodes = nodes.filter((n) => connectedIds.has(n.id));
  const disconnectedNodes = nodes.filter((n) => !connectedIds.has(n.id));

  // Add nodes to the dagre graph
  for (const node of graphNodes) {
    const size = getNodeSize(node, nodeSize);
    g.setNode(node.id, { width: size.width, height: size.height });
  }

  // Add edges — use edge.id as key to support multigraph (duplicate source→target)
  for (const edge of edges) {
    if (!g.hasNode(edge.source) || !g.hasNode(edge.target)) continue;
    g.setEdge(edge.source, edge.target, {}, edge.id);
  }

  dagre.layout(g);

  const { targetPosition, sourcePosition } = getHandlePositions(direction);
  const result: N[] = [];

  // Dagre may reorder nodes within a rank (crossing-minimization).
  // Preserve the input order by collecting positions per rank, then
  // reassigning Y values in input order.
  const isHorizontal = direction === 'LR' || direction === 'RL';

  // Build a lookup of dagre-assigned positions keyed by node id
  const posMap = new Map<string, { x: number; y: number; width: number; height: number }>();
  for (const node of graphNodes) {
    const pos = g.node(node.id);
    const size = getNodeSize(node, nodeSize);
    posMap.set(node.id, { x: pos.x, y: pos.y, width: size.width, height: size.height });
  }

  // Group nodes by their rank coordinate (X for LR/RL, Y for TB/BT)
  const rankKey = (pos: { x: number; y: number }) =>
    isHorizontal ? Math.round(pos.x) : Math.round(pos.y);

  const rankGroups = new Map<number, string[]>();
  for (const node of graphNodes) {
    const pos = posMap.get(node.id)!;
    const key = rankKey(pos);
    if (!rankGroups.has(key)) rankGroups.set(key, []);
    rankGroups.get(key)!.push(node.id);
  }

  // For each rank with multiple nodes, sort the dagre-assigned secondary-axis
  // values and redistribute them in input order
  for (const [, ids] of rankGroups) {
    if (ids.length <= 1) continue;

    // Collect the secondary-axis center values dagre chose, sorted ascending
    const secondaryValues = ids
      .map((id) => {
        const p = posMap.get(id)!;
        return isHorizontal ? p.y : p.x;
      })
      .sort((a, b) => a - b);

    // ids are already in input order (iterated from graphNodes which
    // preserves the nodes array order). Assign sorted values back in input order.
    ids.forEach((id, idx) => {
      const p = posMap.get(id)!;
      if (isHorizontal) {
        p.y = secondaryValues[idx];
      } else {
        p.x = secondaryValues[idx];
      }
    });
  }

  // Map laid-out nodes, converting dagre center-coords to React Flow top-left
  for (const node of graphNodes) {
    const pos = posMap.get(node.id)!;
    result.push({
      ...node,
      targetPosition,
      sourcePosition,
      position: { x: pos.x - pos.width / 2, y: pos.y - pos.height / 2 },
    } as N);
  }

  // Place disconnected nodes after the laid-out graph so they don't overlap
  if (disconnectedNodes.length > 0) {
    let maxY = 0;
    let minX = Infinity;

    for (const n of result) {
      const size = getNodeSize(n, nodeSize);
      maxY = Math.max(maxY, n.position.y + size.height);
      minX = Math.min(minX, n.position.x);
    }

    // When no graph nodes exist (all disconnected), default to origin
    if (minX === Infinity) minX = 0;

    for (let i = 0; i < disconnectedNodes.length; i++) {
      const node = disconnectedNodes[i];
      const size = getNodeSize(node, nodeSize);
      result.push({
        ...node,
        targetPosition,
        sourcePosition,
        position: { x: minX, y: maxY + 30 + i * (size.height + 20) },
      } as N);
    }
  }

  return { nodes: result, edges: [...edges] };
}
