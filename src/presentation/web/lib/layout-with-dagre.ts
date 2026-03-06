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
  repositoryNode: { width: 328, height: 50 },
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
  const isHorizontal = direction === 'LR' || direction === 'RL';

  // Collect dagre center positions keyed by node id
  const centerMap = new Map<string, { cx: number; cy: number; w: number; h: number }>();
  for (const node of graphNodes) {
    const dagreNode = g.node(node.id);
    const size = getNodeSize(node, nodeSize);
    centerMap.set(node.id, { cx: dagreNode.x, cy: dagreNode.y, w: size.width, h: size.height });
  }

  // Post-process: center each group of children around their parent's
  // secondary-axis center so the edge fans out symmetrically.
  // Build parent→children map from the edges.
  const childrenOf = new Map<string, string[]>();
  for (const edge of edges) {
    if (!centerMap.has(edge.source) || !centerMap.has(edge.target)) continue;
    if (!childrenOf.has(edge.source)) childrenOf.set(edge.source, []);
    childrenOf.get(edge.source)!.push(edge.target);
  }

  for (const [parentId, childIds] of childrenOf) {
    if (childIds.length <= 1) continue;

    const parent = centerMap.get(parentId)!;
    const parentCenter = isHorizontal ? parent.cy : parent.cx;

    // Sort children by their current secondary-axis position
    const sorted = childIds
      .filter((id) => centerMap.has(id))
      .sort((a, b) => {
        const pa = centerMap.get(a)!;
        const pb = centerMap.get(b)!;
        return isHorizontal ? pa.cy - pb.cy : pa.cx - pb.cx;
      });

    // Compute the current center of the children group
    const first = centerMap.get(sorted[0])!;
    const last = centerMap.get(sorted[sorted.length - 1])!;
    const groupCenter = isHorizontal ? (first.cy + last.cy) / 2 : (first.cx + last.cx) / 2;

    // Shift all children so the group center aligns with the parent center
    const shift = parentCenter - groupCenter;
    if (Math.abs(shift) > 1) {
      for (const childId of sorted) {
        const c = centerMap.get(childId)!;
        if (isHorizontal) {
          c.cy += shift;
        } else {
          c.cx += shift;
        }
      }
    }
  }

  // Enforce input-order within each sibling group so that the caller's
  // sort (e.g. by createdAt) is respected on the secondary axis.
  const inputIndex = new Map<string, number>();
  for (let i = 0; i < graphNodes.length; i++) {
    inputIndex.set(graphNodes[i].id, i);
  }

  for (const [, childIds] of childrenOf) {
    const valid = childIds.filter((id) => centerMap.has(id));
    if (valid.length <= 1) continue;

    // Collect current secondary-axis positions, sorted ascending
    const positions = valid
      .map((id) => (isHorizontal ? centerMap.get(id)!.cy : centerMap.get(id)!.cx))
      .sort((a, b) => a - b);

    // Sort children by input index (preserves caller's ordering, e.g. createdAt)
    const byInput = [...valid].sort((a, b) => (inputIndex.get(a) ?? 0) - (inputIndex.get(b) ?? 0));

    // Assign sorted positions in input order
    for (let i = 0; i < byInput.length; i++) {
      const c = centerMap.get(byInput[i])!;
      if (isHorizontal) {
        c.cy = positions[i];
      } else {
        c.cx = positions[i];
      }
    }
  }

  // Build result array converting center-coords to React Flow top-left
  const result: N[] = [];
  for (const node of graphNodes) {
    const c = centerMap.get(node.id)!;
    result.push({
      ...node,
      targetPosition,
      sourcePosition,
      position: { x: c.cx - c.w / 2, y: c.cy - c.h / 2 },
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
