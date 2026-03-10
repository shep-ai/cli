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

  // ── Proper tree layout for the secondary axis ──
  // Dagre gives us correct primary-axis (rank/X) positions but its secondary-
  // axis (Y) positioning doesn't respect our tree structure well. Replace it
  // with a bottom-up tree layout:
  //   1. Compute subtree heights (leaves → roots)
  //   2. Position children centered on parent (roots → leaves)
  // This guarantees: no overlaps, parents centered on children, and straight
  // lines for 1-to-1 connections at every depth.

  // Build parent→children map from edges
  const childrenOf = new Map<string, string[]>();
  for (const edge of edges) {
    if (!centerMap.has(edge.source) || !centerMap.has(edge.target)) continue;
    if (!childrenOf.has(edge.source)) childrenOf.set(edge.source, []);
    childrenOf.get(edge.source)!.push(edge.target);
  }

  // Sort children by input order (preserves caller's ordering, e.g. createdAt)
  const inputIndex = new Map<string, number>();
  for (let i = 0; i < graphNodes.length; i++) {
    inputIndex.set(graphNodes[i].id, i);
  }
  for (const [, kids] of childrenOf) {
    kids.sort((a, b) => (inputIndex.get(a) ?? 0) - (inputIndex.get(b) ?? 0));
  }

  // Find tree roots (nodes that are parents but not children)
  const childSet = new Set<string>();
  for (const ids of childrenOf.values()) {
    for (const id of ids) childSet.add(id);
  }
  // Include leaf nodes that have no children and are not in childrenOf keys
  const allConnected = new Set(centerMap.keys());
  const roots = [...allConnected].filter((id) => !childSet.has(id));

  // Bottom-up: compute the total secondary-axis span each subtree needs
  const subtreeSpan = new Map<string, number>();
  function computeSpan(nodeId: string): number {
    if (subtreeSpan.has(nodeId)) return subtreeSpan.get(nodeId)!;
    const c = centerMap.get(nodeId)!;
    const nodeSpan = isHorizontal ? c.h : c.w;
    const kids = childrenOf.get(nodeId);
    if (!kids || kids.length === 0) {
      subtreeSpan.set(nodeId, nodeSpan);
      return nodeSpan;
    }
    let childrenTotalSpan = 0;
    for (const kid of kids) {
      childrenTotalSpan += computeSpan(kid);
    }
    childrenTotalSpan += (kids.length - 1) * nodesep;
    const span = Math.max(nodeSpan, childrenTotalSpan);
    subtreeSpan.set(nodeId, span);
    return span;
  }

  for (const root of roots) computeSpan(root);

  // Top-down: position each node on the secondary axis, centering parent
  // on its children block. For 1-to-1 edges the child gets the same
  // secondary-axis value as its parent (straight line).
  function positionTree(nodeId: string, centerPos: number): void {
    const c = centerMap.get(nodeId)!;
    if (isHorizontal) {
      c.cy = centerPos;
    } else {
      c.cx = centerPos;
    }
    const kids = childrenOf.get(nodeId);
    if (!kids || kids.length === 0) return;

    // Total span occupied by children
    let childrenTotalSpan = 0;
    for (const kid of kids) {
      childrenTotalSpan += subtreeSpan.get(kid) ?? 0;
    }
    childrenTotalSpan += (kids.length - 1) * nodesep;

    // Start from the top of the centered children block
    let cursor = centerPos - childrenTotalSpan / 2;
    for (const kid of kids) {
      const kidSpan = subtreeSpan.get(kid) ?? 0;
      positionTree(kid, cursor + kidSpan / 2);
      cursor += kidSpan + nodesep;
    }
  }

  // Position each root tree. Stack root trees vertically with nodesep gap.
  let rootCursor = 0;
  for (const root of roots) {
    const span = subtreeSpan.get(root) ?? 0;
    positionTree(root, rootCursor + span / 2);
    rootCursor += span + nodesep;
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
