'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Connection, Edge, NodeChange } from '@xyflow/react';
import type { FeatureNodeData } from '@/components/common/feature-node';
import type { RepositoryNodeData } from '@/components/common/repository-node';
import type { CanvasNodeType } from '@/components/features/features-canvas';
import {
  layoutWithDagre,
  CANVAS_LAYOUT_DEFAULTS,
  type LayoutDirection,
} from '@/lib/layout-with-dagre';
import { deleteFeature } from '@/app/actions/delete-feature';
import { addRepository } from '@/app/actions/add-repository';
import { deleteRepository } from '@/app/actions/delete-repository';
import { getFeatureMetadata } from '@/app/actions/get-feature-metadata';
import { fetchGraphData } from '@/app/actions/get-graph-data';
import { useAgentEventsContext } from '@/hooks/agent-events-provider';
import { useSoundAction } from '@/hooks/use-sound-action';
import { createLogger } from '@/lib/logger';

import {
  mapEventTypeToState,
  resolveSseEventUpdates,
} from '@/components/common/feature-node/derive-feature-state';
import { parseMaps, useGraphDerivedState, type GraphCallbacks } from '@/hooks/use-graph-state';
import type { FeatureEntry } from '@/lib/derive-graph';

const log = createLogger('[GraphQuery]');

/** TanStack Query key for the graph data. */
export const GRAPH_DATA_QUERY_KEY = ['graph-data'] as const;

const REFETCH_INTERVAL_MS = 3_000;

export interface GraphData {
  nodes: CanvasNodeType[];
  edges: Edge[];
}

export interface ControlCenterState {
  nodes: CanvasNodeType[];
  edges: Edge[];
  onNodesChange: (changes: NodeChange<CanvasNodeType>[]) => void;
  handleConnect: (connection: Connection) => void;
  handleAddRepository: (path: string) => { wasEmpty: boolean; repoPath: string };
  handleLayout: (direction: LayoutDirection) => void;
  handleDeleteFeature: (featureId: string) => void;
  handleDeleteRepository: (repositoryId: string) => Promise<void>;
  createFeatureNode: (
    sourceNodeId: string | null,
    dataOverride?: Partial<FeatureNodeData>,
    edgeType?: string
  ) => string;
  /** Stable lookup: repositoryPath for a feature node. */
  getFeatureRepositoryPath: (featureNodeId: string) => string | undefined;
  /** Stable lookup: repository data by nodeId. */
  getRepositoryData: (nodeId: string) => RepositoryNodeData | undefined;
  /** Sync callbacks into derived node data (does not trigger re-render). */
  setCallbacks: (callbacks: GraphCallbacks) => void;
}

/** Must match the message string emitted by the SSE route in agent-events/route.ts */
const METADATA_UPDATED_MESSAGE = 'Feature metadata updated';

let nextFeatureId = 0;
let nextRepoTempId = 0;

// ── Cache update helpers ─────────────────────────────────────────────

/** Update a feature node's data fields in the query cache. */
function updateFeatureInCache(
  prev: GraphData,
  nodeId: string,
  updates: Partial<Pick<FeatureNodeData, 'state' | 'lifecycle' | 'name' | 'description'>>
): GraphData {
  let changed = false;
  const nodes = prev.nodes.map((n) => {
    if (n.id !== nodeId || n.type !== 'featureNode') return n;
    const data = n.data as FeatureNodeData;
    const isUnchanged =
      (updates.state === undefined || updates.state === data.state) &&
      (updates.lifecycle === undefined || updates.lifecycle === data.lifecycle) &&
      (updates.name === undefined || updates.name === data.name) &&
      (updates.description === undefined || updates.description === data.description);
    if (isUnchanged) return n;
    changed = true;
    return { ...n, data: { ...data, ...updates } };
  });
  return changed ? { ...prev, nodes } : prev;
}

/** Remove a node and its edges from the cache. */
function removeNodeFromCache(prev: GraphData, nodeId: string): GraphData {
  return {
    nodes: prev.nodes.filter((n) => n.id !== nodeId),
    edges: prev.edges.filter((e) => e.source !== nodeId && e.target !== nodeId),
  };
}

export function useControlCenterState(
  initialNodes: CanvasNodeType[],
  initialEdges: Edge[]
): ControlCenterState {
  const router = useRouter();
  const queryClient = useQueryClient();
  const deleteSound = useSoundAction('delete');
  const createSound = useSoundAction('create');

  // ── TanStack Query: replaces setInterval polling ─────────────────
  const { data: serverData } = useQuery<GraphData>({
    queryKey: GRAPH_DATA_QUERY_KEY,
    queryFn: async () => {
      log.debug('fetching graph data');
      return fetchGraphData();
    },
    initialData: { nodes: initialNodes, edges: initialEdges },
    initialDataUpdatedAt: Date.now(),
    refetchInterval: REFETCH_INTERVAL_MS,
    // Keep stale data visible while refetching (no loading flicker)
    placeholderData: (prev) => prev,
  });

  // ── Pending map: local state for optimistic creates ──────────────
  const [pendingMap, setPendingMap] = useState<Map<string, FeatureEntry>>(
    new Map<string, FeatureEntry>()
  );

  // Parse server data into domain Maps
  const { featureMap, repoMap } = useMemo(
    () => parseMaps(serverData.nodes, serverData.edges),
    [serverData]
  );

  // Reconcile pending map: remove entries that now exist in server data
  const prevServerDataRef = useRef(serverData);
  useEffect(() => {
    if (serverData === prevServerDataRef.current) return;
    prevServerDataRef.current = serverData;

    setPendingMap((currentPendingMap) => {
      if (currentPendingMap.size === 0) return currentPendingMap;

      // Build set of real feature keys from server data
      const realFeatureKeys = new Set(
        [...featureMap.values()].map((e) => `${e.data.name}\0${e.data.repositoryPath}`)
      );

      let changed = false;
      const next = new Map(currentPendingMap);
      for (const [tempId, pendingEntry] of currentPendingMap) {
        const key = `${pendingEntry.data.name}\0${pendingEntry.data.repositoryPath}`;
        if (realFeatureKeys.has(key)) {
          next.delete(tempId);
          changed = true;
        }
      }
      return changed ? next : currentPendingMap;
    });
  }, [serverData, featureMap]);

  // ── Callbacks: ref-based to avoid re-renders ─────────────────────
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

  const setCallbacks = useCallback((callbacks: GraphCallbacks) => {
    callbacksRef.current = callbacks;
  }, []);

  // ── Derivation: Maps → React Flow nodes/edges ───────────────────
  const { nodes, edges } = useGraphDerivedState(featureMap, repoMap, pendingMap, stableCallbacks);

  // Refs for stable access to latest nodes/edges
  const nodesRef = useRef(nodes);
  const edgesRef = useRef(edges);
  useEffect(() => {
    nodesRef.current = nodes;
    edgesRef.current = edges;
  }, [nodes, edges]);

  // Stable refs for domain Maps (for use in callbacks)
  const featureMapRef = useRef(featureMap);
  featureMapRef.current = featureMap;
  const repoMapRef = useRef(repoMap);
  repoMapRef.current = repoMap;

  // ── SSE integration: update query cache directly ─────────────────

  // Track previous feature states for fallback notifications
  const prevFeatureStatesRef = useRef<Map<string, FeatureNodeData['state']>>(new Map());
  const { events } = useAgentEventsContext();

  // Fallback notifications: detect state changes from server data that SSE missed
  useEffect(() => {
    const prevStates = prevFeatureStatesRef.current;
    for (const node of serverData.nodes) {
      if (node.type !== 'featureNode') continue;
      const data = node.data as FeatureNodeData;
      const prev = prevStates.get(node.id);
      if (prev !== undefined && prev !== data.state) {
        const sseAlreadyCovered = events.some(
          (e) => e.featureId === data.featureId && mapEventTypeToState(e.eventType) === data.state
        );
        if (!sseAlreadyCovered) {
          if (data.state === 'done') {
            toast.success(data.name, { description: 'Feature completed!' });
          } else if (data.state === 'action-required') {
            toast.warning(data.name, {
              description: 'Waiting for your approval',
              action: {
                label: 'Review',
                onClick: () => router.push(`/feature/${data.featureId}`),
              },
            });
          } else if (data.state === 'error') {
            toast.error(data.name, { description: data.errorMessage ?? 'Agent failed' });
          }
        }
      }
      prevStates.set(node.id, data.state);
    }
  }, [serverData, events, router]);

  // SSE effect: update query cache with state + lifecycle changes
  const processedEventCountRef = useRef(0);

  useEffect(() => {
    if (processedEventCountRef.current > events.length) {
      processedEventCountRef.current = 0;
    }
    if (events.length <= processedEventCountRef.current) return;
    const newEvents = events.slice(processedEventCountRef.current);
    processedEventCountRef.current = events.length;

    for (const { featureId, state, lifecycle } of resolveSseEventUpdates(newEvents)) {
      if (state !== undefined || lifecycle !== undefined) {
        const nodeId = `feat-${featureId}`;
        queryClient.setQueryData<GraphData>(GRAPH_DATA_QUERY_KEY, (prev) => {
          if (!prev) return prev;
          return updateFeatureInCache(prev, nodeId, {
            ...(state !== undefined && { state }),
            ...(lifecycle !== undefined && { lifecycle }),
          });
        });
      }
    }
  }, [events, queryClient]);

  // Listen for optimistic approval events from the drawer
  useEffect(() => {
    const handler = (e: Event) => {
      const { featureId } = (e as CustomEvent<{ featureId: string }>).detail;
      queryClient.setQueryData<GraphData>(GRAPH_DATA_QUERY_KEY, (prev) => {
        if (!prev) return prev;
        return updateFeatureInCache(prev, `feat-${featureId}`, { state: 'running' });
      });
    };
    window.addEventListener('shep:feature-approved', handler);
    return () => window.removeEventListener('shep:feature-approved', handler);
  }, [queryClient]);

  // SSE metadata updates: fetch name + description when changed
  const metadataFetchedRef = useRef<Set<string>>(new Set());
  const processedMetadataCountRef = useRef(0);

  useEffect(() => {
    if (processedMetadataCountRef.current > events.length) {
      processedMetadataCountRef.current = 0;
    }
    if (events.length <= processedMetadataCountRef.current) return;
    const newEvents = events.slice(processedMetadataCountRef.current);
    processedMetadataCountRef.current = events.length;

    for (const event of newEvents) {
      if (event.message !== METADATA_UPDATED_MESSAGE) continue;
      if (metadataFetchedRef.current.has(event.featureId)) continue;
      metadataFetchedRef.current.add(event.featureId);

      const nodeId = `feat-${event.featureId}`;
      getFeatureMetadata(event.featureId)
        .then((meta) => {
          if (meta) {
            queryClient.setQueryData<GraphData>(GRAPH_DATA_QUERY_KEY, (prev) => {
              if (!prev) return prev;
              return updateFeatureInCache(prev, nodeId, {
                name: meta.name,
                description: meta.description,
              });
            });
          }
        })
        .catch(() => {
          // Silent: metadata fetch failure is non-critical
        });
    }
  }, [events, queryClient]);

  // ── Mutations ────────────────────────────────────────────────────

  const deleteFeatureMutation = useMutation({
    mutationFn: (featureId: string) => deleteFeature(featureId),
    onMutate: (featureId: string) => {
      const nodeId = `feat-${featureId}`;

      // Snapshot for rollback
      const previousData = queryClient.getQueryData<GraphData>(GRAPH_DATA_QUERY_KEY);

      // Optimistic removal from cache
      queryClient.setQueryData<GraphData>(GRAPH_DATA_QUERY_KEY, (prev) => {
        if (!prev) return prev;
        return removeNodeFromCache(prev, nodeId);
      });

      return { previousData };
    },
    onSuccess: (result, _featureId, context) => {
      if ('error' in result && result.error) {
        // Server rejected: rollback
        if (context?.previousData) {
          queryClient.setQueryData(GRAPH_DATA_QUERY_KEY, context.previousData);
        }
        toast.error(result.error as string);
        return;
      }
      deleteSound.play();
      toast.success('Feature deleted successfully');
      router.push('/');
    },
    onError: (_err, _featureId, context) => {
      // Rollback on network failure
      if (context?.previousData) {
        queryClient.setQueryData(GRAPH_DATA_QUERY_KEY, context.previousData);
      }
      toast.error('Failed to delete feature');
    },
  });

  const deleteRepositoryMutation = useMutation({
    mutationFn: (repositoryId: string) => deleteRepository(repositoryId),
    onMutate: (repositoryId: string) => {
      const repoNodeId = `repo-${repositoryId}`;

      // Snapshot for rollback
      const previousData = queryClient.getQueryData<GraphData>(GRAPH_DATA_QUERY_KEY);

      // Find children of this repo via current edges
      const childFeatureIds = new Set(
        edgesRef.current.filter((e) => e.source === repoNodeId).map((e) => e.target)
      );

      // Optimistic removal of repo + children
      queryClient.setQueryData<GraphData>(GRAPH_DATA_QUERY_KEY, (prev) => {
        if (!prev) return prev;
        const idsToRemove = new Set([repoNodeId, ...childFeatureIds]);
        return {
          nodes: prev.nodes.filter((n) => !idsToRemove.has(n.id)),
          edges: prev.edges.filter((e) => !idsToRemove.has(e.source) && !idsToRemove.has(e.target)),
        };
      });

      return { previousData };
    },
    onSuccess: (result, _repositoryId, context) => {
      if (!result.success) {
        // Server rejected: rollback
        if (context?.previousData) {
          queryClient.setQueryData(GRAPH_DATA_QUERY_KEY, context.previousData);
        }
        toast.error(result.error ?? 'Failed to remove repository');
        return;
      }
      deleteSound.play();
      toast.success('Repository removed');
    },
    onError: (_err, _repositoryId, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(GRAPH_DATA_QUERY_KEY, context.previousData);
      }
      toast.error('Failed to remove repository');
    },
  });

  const addRepositoryMutation = useMutation({
    mutationFn: (input: { path: string; name: string; tempId: string }) =>
      addRepository({ path: input.path, name: input.name }),
    onMutate: (input) => {
      // Optimistic: add temp repo node to cache
      queryClient.setQueryData<GraphData>(GRAPH_DATA_QUERY_KEY, (prev) => {
        if (!prev) return prev;
        const tempNode: CanvasNodeType = {
          id: input.tempId,
          type: 'repositoryNode',
          position: { x: 0, y: 0 },
          data: {
            name: input.name,
            repositoryPath: input.path,
            id: input.tempId,
          } as RepositoryNodeData,
        } as CanvasNodeType;
        return { ...prev, nodes: [...prev.nodes, tempNode] };
      });
    },
    onSuccess: (result, input) => {
      if (result.error) {
        // Remove temp node
        queryClient.setQueryData<GraphData>(GRAPH_DATA_QUERY_KEY, (prev) => {
          if (!prev) return prev;
          return removeNodeFromCache(prev, input.tempId);
        });
        toast.error(result.error);
        return;
      }
      // Replace temp node with real one
      const repo = result.repository!;
      queryClient.setQueryData<GraphData>(GRAPH_DATA_QUERY_KEY, (prev) => {
        if (!prev) return prev;
        const realId = `repo-${repo.id}`;
        const nodes = prev.nodes.map((n) => {
          if (n.id !== input.tempId) return n;
          return {
            ...n,
            id: realId,
            data: {
              name: repo.name,
              repositoryPath: repo.path,
              id: repo.id,
            } as RepositoryNodeData,
          } as CanvasNodeType;
        });
        // Update edges that reference the temp ID
        const edges = prev.edges.map((e) => ({
          ...e,
          ...(e.source === input.tempId && { source: realId }),
          ...(e.target === input.tempId && { target: realId }),
        }));
        return { nodes, edges };
      });
      createSound.play();
    },
    onError: (_err, input) => {
      queryClient.setQueryData<GraphData>(GRAPH_DATA_QUERY_KEY, (prev) => {
        if (!prev) return prev;
        return removeNodeFromCache(prev, input.tempId);
      });
      toast.error('Failed to add repository');
    },
  });

  // ── Handlers ─────────────────────────────────────────────────────

  const onNodesChange = useCallback((_changes: NodeChange<CanvasNodeType>[]) => {
    // Intentional no-op: domain Maps are the source of truth.
  }, []);

  const handleConnect = useCallback((_connection: Connection) => {
    // Connections are managed via domain operations, not direct edge manipulation.
  }, []);

  const createFeatureNode = useCallback(
    (
      sourceNodeId: string | null,
      dataOverride?: Partial<FeatureNodeData>,
      edgeType?: string
    ): string => {
      const id = dataOverride?.featureId
        ? `feat-${dataOverride.featureId}`
        : `feature-${Date.now()}-${nextFeatureId++}`;
      const newFeatureData: FeatureNodeData = {
        name: dataOverride?.name ?? 'New Feature',
        description: dataOverride?.description ?? 'Describe what this feature does',
        featureId: dataOverride?.featureId ?? `#${id.slice(-4)}`,
        lifecycle: 'requirements',
        state: dataOverride?.state ?? 'running',
        progress: 0,
        repositoryPath: dataOverride?.repositoryPath ?? '',
        branch: dataOverride?.branch ?? '',
      };

      const parentNodeId = edgeType === 'dependencyEdge' && sourceNodeId ? sourceNodeId : undefined;

      // Add to pendingMap (local state) — survives refetches until server confirms
      setPendingMap((prev) => {
        const next = new Map(prev);
        next.set(id, { nodeId: id, data: newFeatureData, parentNodeId });
        return next;
      });

      return id;
    },
    []
  );

  const handleDeleteFeature = useCallback(
    (featureId: string) => {
      deleteFeatureMutation.mutate(featureId);
    },
    [deleteFeatureMutation]
  );

  const handleDeleteRepository = useCallback(
    async (repositoryId: string) => {
      deleteRepositoryMutation.mutate(repositoryId);
    },
    [deleteRepositoryMutation]
  );

  const handleLayout = useCallback(
    (direction: LayoutDirection) => {
      const result = layoutWithDagre(nodesRef.current, edgesRef.current, {
        ...CANVAS_LAYOUT_DEFAULTS,
        direction,
      });
      // Apply layout by updating the query cache with re-positioned nodes
      queryClient.setQueryData<GraphData>(GRAPH_DATA_QUERY_KEY, (prev) => {
        if (!prev) return prev;
        return { nodes: result.nodes, edges: result.edges };
      });
    },
    [queryClient]
  );

  const handleAddRepository = useCallback(
    (path: string): { wasEmpty: boolean; repoPath: string } => {
      const wasEmpty = repoMapRef.current.size === 0;
      const tempId = `repo-temp-${++nextRepoTempId}`;
      const repoName =
        path
          .replace(/[\\/]+$/, '')
          .split(/[\\/]/)
          .pop() ?? path;

      addRepositoryMutation.mutate({ path, name: repoName, tempId });

      return { wasEmpty, repoPath: path };
    },
    [addRepositoryMutation]
  );

  const getFeatureRepositoryPath = useCallback((featureNodeId: string): string | undefined => {
    return featureMapRef.current.get(featureNodeId)?.data.repositoryPath;
  }, []);

  const getRepositoryData = useCallback((nodeId: string): RepositoryNodeData | undefined => {
    return repoMapRef.current.get(nodeId)?.data;
  }, []);

  return {
    nodes,
    edges,
    onNodesChange,
    handleConnect,
    handleAddRepository,
    handleLayout,
    handleDeleteFeature,
    handleDeleteRepository,
    createFeatureNode,
    getFeatureRepositoryPath,
    getRepositoryData,
    setCallbacks,
  };
}
