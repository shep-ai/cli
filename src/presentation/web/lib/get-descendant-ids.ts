import type { Edge } from '@xyflow/react';

/**
 * Walk dep-* edges recursively from `nodeId` to collect all descendant node IDs.
 * Uses BFS with a visited set to handle cycles gracefully.
 * Returns a Set of descendant IDs (does not include the parent itself).
 */
export function getDescendantIds(nodeId: string, edges: Edge[]): Set<string> {
  // Build adjacency map from dep-* edges only
  const children = new Map<string, string[]>();
  for (const edge of edges) {
    if (!edge.id.startsWith('dep-')) continue;
    const existing = children.get(edge.source);
    if (existing) {
      existing.push(edge.target);
    } else {
      children.set(edge.source, [edge.target]);
    }
  }

  // BFS from nodeId — seed visited with root to prevent cycles re-adding it
  const visited = new Set<string>([nodeId]);
  let frontier = children.get(nodeId) ?? [];

  while (frontier.length > 0) {
    const nextFrontier: string[] = [];
    for (const id of frontier) {
      if (visited.has(id)) continue;
      visited.add(id);
      const grandchildren = children.get(id);
      if (grandchildren) {
        nextFrontier.push(...grandchildren);
      }
    }
    frontier = nextFrontier;
  }

  // Remove the root node — only descendants should be returned
  visited.delete(nodeId);
  return visited;
}
