'use client';

import { useState, useMemo, useCallback, useRef } from 'react';
import type { Edge } from '@xyflow/react';
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

export interface UseGraphStateReturn {
  /** Derived React Flow nodes (from domain Maps). */
  nodes: CanvasNodeType[];
  /** Derived React Flow edges (from domain Maps). */
  edges: Edge[];
  /**
   * Reconcile domain Maps with fresh server data (new initialNodes/initialEdges).
   * Preserves pending (creating) nodes unless a matching real feature appears.
   */
  reconcile: (newNodes: CanvasNodeType[], newEdges: Edge[]) => void;
  /** Update a feature's state/lifecycle/name (e.g., from SSE events). */
  updateFeature: (
    featureNodeId: string,
    updates: Partial<Pick<FeatureNodeData, 'state' | 'lifecycle' | 'name' | 'description'>>
  ) => void;
  /** Add a pending (optimistic) feature node (state='creating'). */
  addPendingFeature: (nodeId: string, data: FeatureNodeData, parentNodeId?: string) => void;
  /** Remove a pending feature node (e.g., on rollback). */
  removePendingFeature: (nodeId: string) => void;
  /** Remove a real feature node from the domain Map. */
  removeFeature: (nodeId: string) => void;
  /** Restore a previously removed feature (rollback). */
  restoreFeature: (nodeId: string, entry: FeatureEntry) => void;
  /** Add a repository node (may use a temp ID initially). */
  addRepository: (nodeId: string, data: RepositoryNodeData) => void;
  /** Remove a repository node. */
  removeRepository: (nodeId: string) => void;
  /** Replace a temp repo ID with the real one (atomic). */
  replaceRepository: (tempId: string, realId: string, data: RepositoryNodeData) => void;
  /** Stable lookup: get the repositoryPath for a feature node. */
  getFeatureRepositoryPath: (featureNodeId: string) => string | undefined;
  /** Stable lookup: get repository node data by nodeId. */
  getRepositoryData: (nodeId: string) => RepositoryNodeData | undefined;
  /** Update callbacks injected into node data (does NOT trigger re-render). */
  setCallbacks: (callbacks: GraphCallbacks) => void;
}

/** Parse initialNodes + initialEdges into domain Maps. */
function parseMaps(
  initialNodes: CanvasNodeType[],
  initialEdges: Edge[]
): {
  featureMap: Map<string, FeatureEntry>;
  repoMap: Map<string, RepoEntry>;
} {
  // Build parentNodeId map from dependency edges
  const parentByChild = new Map<string, string>();
  for (const edge of initialEdges) {
    if (edge.type === 'dependencyEdge' || edge.id.startsWith('dep-')) {
      parentByChild.set(edge.target, edge.source);
    }
  }

  const featureMap = new Map<string, FeatureEntry>();
  const repoMap = new Map<string, RepoEntry>();

  for (const node of initialNodes) {
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

export function useGraphState(
  initialNodes: CanvasNodeType[],
  initialEdges: Edge[]
): UseGraphStateReturn {
  // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: parse only on mount (like useState initializer)
  const init = useMemo(() => parseMaps(initialNodes, initialEdges), []);

  const [featureMap, setFeatureMap] = useState<Map<string, FeatureEntry>>(init.featureMap);
  const [repoMap, setRepoMap] = useState<Map<string, RepoEntry>>(init.repoMap);
  const [pendingMap, setPendingMap] = useState<Map<string, FeatureEntry>>(
    new Map<string, FeatureEntry>()
  );

  // Buffer for SSE updates that arrive before their feature is in featureMap.
  // When reconcile adds new features, buffered updates are applied automatically.
  const pendingUpdatesRef = useRef<
    Map<string, Partial<Pick<FeatureNodeData, 'state' | 'lifecycle' | 'name' | 'description'>>>
  >(new Map());

  // Callbacks stored in a ref so changing them doesn't trigger re-render.
  // The stable wrapper object reads from the ref so node closures always use latest callbacks.
  const callbacksRef = useRef<GraphCallbacks>({});
  const stableCallbacks = useMemo<GraphCallbacks>(
    () => ({
      onNodeAction: (nodeId) => callbacksRef.current.onNodeAction?.(nodeId),
      onNodeSettings: (nodeId) => callbacksRef.current.onNodeSettings?.(nodeId),
      onFeatureDelete: (featureId) => callbacksRef.current.onFeatureDelete?.(featureId),
      onRepositoryAdd: (nodeId) => callbacksRef.current.onRepositoryAdd?.(nodeId),
      onRepositoryClick: (nodeId) => callbacksRef.current.onRepositoryClick?.(nodeId),
      onRepositoryDelete: (repositoryId) => callbacksRef.current.onRepositoryDelete?.(repositoryId),
    }),
    []
  );

  // Stable refs for domain Maps (for use in callbacks without depending on state)
  const featureMapRef = useRef(featureMap);
  featureMapRef.current = featureMap;
  const repoMapRef = useRef(repoMap);
  repoMapRef.current = repoMap;

  // Derived nodes/edges — only re-runs when domain Maps change (not callbacks)
  const { nodes, edges } = useMemo(() => {
    const derived = deriveGraph(featureMap, repoMap, pendingMap, stableCallbacks);
    return layoutWithDagre(derived.nodes, derived.edges, CANVAS_LAYOUT_DEFAULTS);
  }, [featureMap, repoMap, pendingMap, stableCallbacks]);

  // --- Mutations ---

  const reconcile = useCallback((newNodes: CanvasNodeType[], newEdges: Edge[]) => {
    const { featureMap: newFeatureMap, repoMap: newRepoMap } = parseMaps(newNodes, newEdges);

    setFeatureMap((currentFeatureMap) => {
      // Preserve pending (creating) nodes unless matched by name+repositoryPath from newFeatureMap
      const pendingEntries = [...currentFeatureMap.entries()].filter(
        ([, e]) => e.data.state === 'creating'
      );

      const merged = new Map(newFeatureMap);

      // Keep pending nodes that don't have a real counterpart in new data
      for (const [tempId, pendingEntry] of pendingEntries) {
        const matched = [...newFeatureMap.values()].some(
          (e) =>
            e.data.name === pendingEntry.data.name &&
            e.data.repositoryPath === pendingEntry.data.repositoryPath
        );
        if (!matched) {
          merged.set(tempId, pendingEntry);
        }
      }

      // Apply any buffered SSE updates to features that now exist in the map
      for (const [nodeId, updates] of pendingUpdatesRef.current) {
        const entry = merged.get(nodeId);
        if (entry) {
          merged.set(nodeId, { ...entry, data: { ...entry.data, ...updates } });
          pendingUpdatesRef.current.delete(nodeId);
        }
      }

      return merged;
    });

    // Clean pendingMap entries that now have a real counterpart in server data
    setPendingMap((currentPendingMap) => {
      if (currentPendingMap.size === 0) return currentPendingMap;
      let changed = false;
      const next = new Map(currentPendingMap);
      for (const [tempId, pendingEntry] of currentPendingMap) {
        const matched = [...newFeatureMap.values()].some(
          (e) =>
            e.data.name === pendingEntry.data.name &&
            e.data.repositoryPath === pendingEntry.data.repositoryPath
        );
        if (matched) {
          next.delete(tempId);
          changed = true;
        }
      }
      return changed ? next : currentPendingMap;
    });

    setRepoMap(newRepoMap);
  }, []);

  const updateFeature = useCallback(
    (
      featureNodeId: string,
      updates: Partial<Pick<FeatureNodeData, 'state' | 'lifecycle' | 'name' | 'description'>>
    ) => {
      setFeatureMap((prev) => {
        const entry = prev.get(featureNodeId);
        if (!entry) {
          // Feature not yet in map — buffer update for when reconcile adds it
          pendingUpdatesRef.current.set(featureNodeId, {
            ...pendingUpdatesRef.current.get(featureNodeId),
            ...updates,
          });
          return prev;
        }
        // Clear any buffered update for this feature since it's now in the map
        pendingUpdatesRef.current.delete(featureNodeId);
        // Skip if no actual change (prevents unnecessary re-renders on event replay)
        const stateUnchanged = updates.state === undefined || updates.state === entry.data.state;
        const lifecycleUnchanged =
          updates.lifecycle === undefined || updates.lifecycle === entry.data.lifecycle;
        const nameUnchanged = updates.name === undefined || updates.name === entry.data.name;
        const descUnchanged =
          updates.description === undefined || updates.description === entry.data.description;
        if (stateUnchanged && lifecycleUnchanged && nameUnchanged && descUnchanged) {
          return prev;
        }
        const next = new Map(prev);
        next.set(featureNodeId, { ...entry, data: { ...entry.data, ...updates } });
        return next;
      });

      // Also check pendingMap
      setPendingMap((prev) => {
        const entry = prev.get(featureNodeId);
        if (!entry) return prev;
        const stateUnchanged = updates.state === undefined || updates.state === entry.data.state;
        const lifecycleUnchanged =
          updates.lifecycle === undefined || updates.lifecycle === entry.data.lifecycle;
        const nameUnchanged = updates.name === undefined || updates.name === entry.data.name;
        const descUnchanged =
          updates.description === undefined || updates.description === entry.data.description;
        if (stateUnchanged && lifecycleUnchanged && nameUnchanged && descUnchanged) return prev;
        const next = new Map(prev);
        next.set(featureNodeId, { ...entry, data: { ...entry.data, ...updates } });
        return next;
      });
    },
    []
  );

  const addPendingFeature = useCallback(
    (nodeId: string, data: FeatureNodeData, parentNodeId?: string) => {
      setPendingMap((prev) => {
        const next = new Map(prev);
        next.set(nodeId, { nodeId, data, parentNodeId });
        return next;
      });
    },
    []
  );

  const removePendingFeature = useCallback((nodeId: string) => {
    setPendingMap((prev) => {
      if (!prev.has(nodeId)) return prev;
      const next = new Map(prev);
      next.delete(nodeId);
      return next;
    });
  }, []);

  const removeFeature = useCallback((nodeId: string) => {
    setFeatureMap((prev) => {
      if (!prev.has(nodeId)) return prev;
      const next = new Map(prev);
      next.delete(nodeId);
      return next;
    });
  }, []);

  const restoreFeature = useCallback((nodeId: string, entry: FeatureEntry) => {
    setFeatureMap((prev) => {
      const next = new Map(prev);
      next.set(nodeId, entry);
      return next;
    });
  }, []);

  const addRepository = useCallback((nodeId: string, data: RepositoryNodeData) => {
    setRepoMap((prev) => {
      const next = new Map(prev);
      next.set(nodeId, { nodeId, data });
      return next;
    });
  }, []);

  const removeRepository = useCallback((nodeId: string) => {
    setRepoMap((prev) => {
      if (!prev.has(nodeId)) return prev;
      const next = new Map(prev);
      next.delete(nodeId);
      return next;
    });
  }, []);

  const replaceRepository = useCallback(
    (tempId: string, realId: string, data: RepositoryNodeData) => {
      setRepoMap((prev) => {
        if (!prev.has(tempId)) return prev;
        const next = new Map(prev);
        next.delete(tempId);
        next.set(realId, { nodeId: realId, data });
        return next;
      });
    },
    []
  );

  const getFeatureRepositoryPath = useCallback((featureNodeId: string): string | undefined => {
    return featureMapRef.current.get(featureNodeId)?.data.repositoryPath;
  }, []);

  const getRepositoryData = useCallback((nodeId: string): RepositoryNodeData | undefined => {
    return repoMapRef.current.get(nodeId)?.data;
  }, []);

  const setCallbacks = useCallback((callbacks: GraphCallbacks) => {
    callbacksRef.current = callbacks;
  }, []);

  return {
    nodes,
    edges,
    reconcile,
    updateFeature,
    addPendingFeature,
    removePendingFeature,
    removeFeature,
    restoreFeature,
    addRepository,
    removeRepository,
    replaceRepository,
    getFeatureRepositoryPath,
    getRepositoryData,
    setCallbacks,
  };
}
