'use client';

import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
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
import { useGraphState, type GraphCallbacks } from '@/hooks/use-graph-state';
import type { FeatureEntry } from '@/lib/derive-graph';

const log = createLogger('[Polling]');
const POLL_INTERVAL_MS = 3_000;

export interface ControlCenterState {
  nodes: CanvasNodeType[];
  edges: Edge[];
  onNodesChange: (changes: NodeChange<CanvasNodeType>[]) => void;
  handleConnect: (connection: Connection) => void;
  handleAddRepository: (path: string) => { wasEmpty: boolean; repoPath: string };
  handleLayout: (direction: LayoutDirection) => void;
  handleDeleteFeature: (featureId: string, cleanup?: boolean) => void;
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

export function useControlCenterState(
  initialNodes: CanvasNodeType[],
  initialEdges: Edge[]
): ControlCenterState {
  const router = useRouter();
  const deleteSound = useSoundAction('delete');
  const createSound = useSoundAction('create');

  const {
    nodes,
    edges,
    reconcile,
    updateFeature,
    addPendingFeature,
    removeFeature,
    restoreFeature,
    addRepository: addRepositoryToMap,
    removeRepository,
    replaceRepository,
    getFeatureRepositoryPath,
    getRepositoryData,
    getRepoMapSize,
    setCallbacks,
  } = useGraphState(initialNodes, initialEdges);

  // Refs for stable access to latest nodes/edges without callback recreation
  const nodesRef = useRef(nodes);
  const edgesRef = useRef(edges);
  useEffect(() => {
    nodesRef.current = nodes;
    edgesRef.current = edges;
  }, [nodes, edges]);

  // Sync server props into domain Maps when initialNodes/initialEdges change.
  // Keyed by a stable string so we don't re-reconcile on every render.
  const initialNodeKey = useMemo(
    () =>
      initialNodes
        .map((n) => n.id)
        .sort()
        .join(','),
    [initialNodes]
  );
  const initialDataKey = useMemo(
    () =>
      initialNodes
        .filter((n) => n.type === 'featureNode')
        .map((n) => {
          const d = n.data as FeatureNodeData;
          return `${n.id}:${d.state}:${d.lifecycle}`;
        })
        .sort()
        .join(','),
    [initialNodes]
  );

  const prevReconcileKey = useRef('');

  useEffect(() => {
    const key = `${initialNodeKey}|${initialDataKey}`;
    if (key !== prevReconcileKey.current) {
      prevReconcileKey.current = key;
      reconcile(initialNodes, initialEdges);
    }
  }, [initialNodeKey, initialDataKey, initialNodes, initialEdges, reconcile]);

  // Track previous feature states for fallback notifications
  const prevFeatureStatesRef = useRef<Map<string, FeatureNodeData['state']>>(new Map());

  const { events } = useAgentEventsContext();

  useEffect(() => {
    const prevStates = prevFeatureStatesRef.current;
    for (const node of initialNodes) {
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
  }, [initialDataKey, initialNodes, events, router]);

  // SSE effect: only state + lifecycle updates
  const processedEventCountRef = useRef(0);

  useEffect(() => {
    // Clamp cursor if events were pruned
    if (processedEventCountRef.current > events.length) {
      processedEventCountRef.current = 0;
    }
    if (events.length <= processedEventCountRef.current) return;
    const newEvents = events.slice(processedEventCountRef.current);
    processedEventCountRef.current = events.length;

    for (const { featureId, state, lifecycle } of resolveSseEventUpdates(newEvents)) {
      if (state !== undefined || lifecycle !== undefined) {
        updateFeature(`feat-${featureId}`, {
          ...(state !== undefined && { state }),
          ...(lifecycle !== undefined && { lifecycle }),
        });
      }
    }
  }, [events, updateFeature]);

  // Listen for optimistic approval events from the drawer (fires before SSE arrives)
  useEffect(() => {
    const handler = (e: Event) => {
      const { featureId } = (e as CustomEvent<{ featureId: string }>).detail;
      updateFeature(`feat-${featureId}`, { state: 'running' });
    };
    window.addEventListener('shep:feature-approved', handler);
    return () => window.removeEventListener('shep:feature-approved', handler);
  }, [updateFeature]);

  // Separate effect: fetch metadata (name + description) when SSE reports it changed
  const metadataFetchedRef = useRef<Set<string>>(new Set());
  const processedMetadataCountRef = useRef(0);

  useEffect(() => {
    // Clamp cursor if events were pruned
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
            updateFeature(nodeId, { name: meta.name, description: meta.description });
          }
        })
        .catch(() => {
          // Silent: metadata fetch failure is non-critical
        });
    }
  }, [events, updateFeature]);

  // --- Polling fallback: catch any SSE events that were missed ---
  useEffect(() => {
    log.debug(`polling enabled (${POLL_INTERVAL_MS}ms interval)`);

    const timer = setInterval(async () => {
      try {
        const { nodes: freshNodes, edges: freshEdges } = await fetchGraphData();
        reconcile(freshNodes, freshEdges);
      } catch {
        log.warn('poll fetch failed — will retry next interval');
      }
    }, POLL_INTERVAL_MS);

    return () => {
      log.debug('polling disabled');
      clearInterval(timer);
    };
  }, [reconcile]);

  // onNodesChange is a no-op: nodes are derived from domain Maps.
  // Since nodesDraggable=false and elementsSelectable=false, only React Flow's
  // internal replace/dimensions changes come through — we ignore them all.
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
      // Use real feature ID when available (from server), otherwise temp ID
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

      addPendingFeature(id, newFeatureData, parentNodeId);

      return id;
    },
    [addPendingFeature]
  );

  const handleDeleteFeature = useCallback(
    (featureId: string, cleanup?: boolean) => {
      const nodeId = `feat-${featureId}`;

      // Find the current entry for rollback
      const prevEntry = nodesRef.current
        .filter((n) => n.id === nodeId)
        .map((n) => ({
          nodeId: n.id,
          data: n.data as FeatureNodeData,
        }))[0];

      // Optimistic removal
      removeFeature(nodeId);
      deleteSound.play();
      toast.success('Feature deleted successfully');
      router.push('/');

      deleteFeature(featureId, cleanup)
        .then((result) => {
          if (result.error) {
            if (prevEntry) restoreFeature(nodeId, prevEntry);
            toast.error(result.error);
          }
        })
        .catch(() => {
          if (prevEntry) restoreFeature(nodeId, prevEntry);
          toast.error('Failed to delete feature');
        });
    },
    [router, deleteSound, removeFeature, restoreFeature]
  );

  const handleDeleteRepository = useCallback(
    async (repositoryId: string) => {
      const repoNodeId = `repo-${repositoryId}`;

      // Find children of this repo via edges
      const childFeatureIds = new Set(
        edgesRef.current.filter((e) => e.source === repoNodeId).map((e) => e.target)
      );

      // Snapshot for rollback
      const prevRepoData = getRepositoryData(repoNodeId);
      const childSnapshots = new Map<string, FeatureEntry>();
      for (const childId of childFeatureIds) {
        const childNode = nodesRef.current.find((n) => n.id === childId);
        if (childNode) {
          childSnapshots.set(childId, { nodeId: childId, data: childNode.data as FeatureNodeData });
        }
      }

      const rollback = () => {
        if (prevRepoData) addRepositoryToMap(repoNodeId, prevRepoData);
        for (const [childId, entry] of childSnapshots) {
          restoreFeature(childId, entry);
        }
      };

      // Optimistic: remove repo + children
      removeRepository(repoNodeId);
      for (const childId of childFeatureIds) {
        removeFeature(childId);
      }

      try {
        const result = await deleteRepository(repositoryId);
        if (!result.success) {
          toast.error(result.error ?? 'Failed to remove repository');
          rollback();
          return;
        }
        deleteSound.play();
        toast.success('Repository removed');
      } catch {
        toast.error('Failed to remove repository');
        rollback();
      }
    },
    [
      deleteSound,
      removeRepository,
      removeFeature,
      addRepositoryToMap,
      restoreFeature,
      getRepositoryData,
    ]
  );

  const handleLayout = useCallback(
    (direction: LayoutDirection) => {
      // Layout is applied via reconcile on next server prop update.
      // For immediate re-layout, we apply dagre and trigger a reconcile-like update.
      const result = layoutWithDagre(nodesRef.current, edgesRef.current, {
        ...CANVAS_LAYOUT_DEFAULTS,
        direction,
      });
      reconcile(result.nodes, result.edges);
    },
    [reconcile]
  );

  const handleAddRepository = useCallback(
    (path: string): { wasEmpty: boolean; repoPath: string } => {
      const wasEmpty = getRepoMapSize() === 0;
      const tempId = `repo-temp-${++nextRepoTempId}`;
      const repoName =
        path
          .replace(/[\\/]+$/, '')
          .split(/[\\/]/)
          .pop() ?? path;

      addRepositoryToMap(tempId, { name: repoName, repositoryPath: path, id: tempId });

      addRepository({ path, name: repoName })
        .then((result) => {
          if (result.error) {
            removeRepository(tempId);
            toast.error(result.error);
            return;
          }
          const repo = result.repository!;
          const realId = `repo-${repo.id}`;
          replaceRepository(tempId, realId, {
            name: repo.name,
            repositoryPath: repo.path,
            id: repo.id,
          });
          createSound.play();
        })
        .catch(() => {
          removeRepository(tempId);
          toast.error('Failed to add repository');
        });

      return { wasEmpty, repoPath: path };
    },
    [addRepositoryToMap, removeRepository, replaceRepository, createSound, getRepoMapSize]
  );

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
