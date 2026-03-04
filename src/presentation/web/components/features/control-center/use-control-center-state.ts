'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { applyNodeChanges } from '@xyflow/react';
import type { Connection, Edge, NodeChange } from '@xyflow/react';
import type { FeatureNodeData } from '@/components/common/feature-node';
import type { CanvasNodeType } from '@/components/features/features-canvas';
import {
  layoutWithDagre,
  CANVAS_LAYOUT_DEFAULTS,
  type LayoutDirection,
} from '@/lib/layout-with-dagre';
import { deleteFeature } from '@/app/actions/delete-feature';
import { addRepository } from '@/app/actions/add-repository';
import { deleteRepository } from '@/app/actions/delete-repository';
import { useAgentEventsContext } from '@/hooks/agent-events-provider';
import { useSoundAction } from '@/hooks/use-sound-action';
import {
  mapEventTypeToState,
  mapPhaseNameToLifecycle,
} from '@/components/common/feature-node/derive-feature-state';

export interface ControlCenterState {
  nodes: CanvasNodeType[];
  edges: Edge[];
  onNodesChange: (changes: NodeChange<CanvasNodeType>[]) => void;
  handleConnect: (connection: Connection) => void;
  handleAddRepository: (path: string) => void;
  handleLayout: (direction: LayoutDirection) => void;
  handleDeleteFeature: (featureId: string) => void;
  handleDeleteRepository: (repositoryId: string) => Promise<void>;
  createFeatureNode: (
    sourceNodeId: string | null,
    dataOverride?: Partial<FeatureNodeData>
  ) => string;
}

let nextFeatureId = 0;

export function useControlCenterState(
  initialNodes: CanvasNodeType[],
  initialEdges: Edge[],
  /** When true, background router.refresh() calls (polling / SSE debounce) are suppressed. */
  isRefreshBlocked?: () => boolean
): ControlCenterState {
  const router = useRouter();
  const [nodes, setNodes] = useState<CanvasNodeType[]>(initialNodes);
  // eslint-disable-next-line react/hook-use-state -- raw setter renamed; public setEdges wrapper keeps edgesRef in sync
  const [edges, setEdgesRaw] = useState<Edge[]>(initialEdges);
  const edgesRef = useRef<Edge[]>(initialEdges);

  // Wrapper that keeps edgesRef in sync with edges state, allowing
  // createFeatureNode to read current edges without a closure dependency.
  const setEdges = useCallback((update: Edge[] | ((prev: Edge[]) => Edge[])) => {
    setEdgesRaw((prev) => {
      const next = typeof update === 'function' ? update(prev) : update;
      edgesRef.current = next;
      return next;
    });
  }, []);
  const deleteSound = useSoundAction('delete');
  const createSound = useSoundAction('create');

  // Sync server props into local state when router.refresh() delivers new data
  const initialNodeKey = initialNodes
    .map((n) => n.id)
    .sort()
    .join(',');
  const initialEdgeKey = initialEdges
    .map((e) => e.id)
    .sort()
    .join(',');

  // Track previous feature states so we can detect transitions on server refresh
  const prevFeatureStatesRef = useRef<Map<string, FeatureNodeData['state']>>(new Map());

  // Stable key that changes when feature DATA changes (state/lifecycle), not just IDs.
  const initialDataKey = initialNodes
    .filter((n) => n.type === 'featureNode')
    .map((n) => {
      const d = n.data as FeatureNodeData;
      return `${n.id}:${d.state}:${d.lifecycle}`;
    })
    .sort()
    .join(',');

  // Sync server props into local state — keyed by derived strings (initialNodeKey/initialEdgeKey)
  // to avoid infinite re-renders from unstable array references.
  useEffect(() => {
    setNodes((currentNodes) => {
      // Build a lookup of current node positions by ID
      const currentById = new Map(currentNodes.map((n) => [n.id, n]));

      // Identify optimistic "creating" nodes (they have temp IDs not in server data)
      const serverIds = new Set(initialNodes.map((n) => n.id));
      const creatingNodes = currentNodes.filter(
        (n) =>
          n.type === 'featureNode' &&
          (n.data as FeatureNodeData).state === 'creating' &&
          !serverIds.has(n.id)
      );

      // Merge server nodes with client positions, tracking if relayout is needed
      let needsRelayout = false;
      const merged = initialNodes.map((serverNode) => {
        // Node already exists on canvas — keep its position, update data
        const existing = currentById.get(serverNode.id);
        if (existing) {
          return { ...serverNode, position: existing.position };
        }

        // New server node — inherit position from an optimistic creating node if available
        if (serverNode.type === 'featureNode' && creatingNodes.length > 0) {
          const donor = creatingNodes.shift()!;
          return { ...serverNode, position: donor.position };
        }

        // Truly new node with no optimistic counterpart — needs relayout
        needsRelayout = true;
        return serverNode;
      });

      // Also check if non-creating nodes were removed (graph got smaller)
      if (!needsRelayout) {
        needsRelayout = currentNodes.some(
          (cn) =>
            !serverIds.has(cn.id) &&
            !(cn.type === 'featureNode' && (cn.data as FeatureNodeData).state === 'creating')
        );
      }

      if (needsRelayout) {
        const layoutResult = layoutWithDagre(merged, initialEdges, CANVAS_LAYOUT_DEFAULTS);
        setEdges(layoutResult.edges);
        return layoutResult.nodes;
      }

      return merged;
    });
  }, [initialNodeKey, initialNodes, initialEdges, setEdges]);

  useEffect(() => {
    setEdges(initialEdges);
  }, [initialEdgeKey, initialEdges, setEdges]);

  // Fallback notifications from server-refresh state transitions.
  // Fires only when SSE didn't already deliver the matching event for a feature,
  // e.g. when the SSE connection was down or the event was seeded into the cache.
  const { events } = useAgentEventsContext();

  useEffect(() => {
    const prevStates = prevFeatureStatesRef.current;

    for (const node of initialNodes) {
      if (node.type !== 'featureNode') continue;
      const data = node.data as FeatureNodeData;
      const prev = prevStates.get(node.id);

      if (prev !== undefined && prev !== data.state) {
        // Check if SSE already delivered a matching event for this feature
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
                onClick: () => {
                  router.push(`/feature/${data.featureId}`);
                },
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

  // Targeted optimistic updates from SSE agent events + debounced reconciliation.
  // Uses `events` array (not `lastEvent`) so that React batching cannot silently
  // drop events when multiple SSE messages arrive in the same tick.
  const processedEventCountRef = useRef(0);
  const reconcileTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    return () => clearTimeout(reconcileTimerRef.current);
  }, []);

  useEffect(() => {
    if (events.length <= processedEventCountRef.current) return;

    const newEvents = events.slice(processedEventCountRef.current);
    processedEventCountRef.current = events.length;

    for (const event of newEvents) {
      const newState = mapEventTypeToState(event.eventType);
      const newLifecycle = mapPhaseNameToLifecycle(event.phaseName);

      // Targeted node update — only clone the matched node
      setNodes((prev) =>
        prev.map((node) => {
          if (node.type !== 'featureNode') return node;
          const data = node.data as FeatureNodeData;
          if (data.featureId !== event.featureId) return node;
          return {
            ...node,
            data: {
              ...data,
              state: newState,
              ...(newLifecycle !== undefined && { lifecycle: newLifecycle }),
            },
          };
        })
      );
    }

    // Debounced background reconciliation (3s after last SSE event)
    clearTimeout(reconcileTimerRef.current);
    reconcileTimerRef.current = setTimeout(() => {
      if (!isRefreshBlocked?.()) router.refresh();
    }, 3000);
  }, [events, router, isRefreshBlocked]);

  // Periodic polling fallback: refresh server data every 5s when any feature
  // is in an active state (running/action-required). This ensures the UI stays
  // current even if the SSE connection drops — belt-and-suspenders alongside SSE.
  useEffect(() => {
    const hasActiveFeature = nodes.some((n) => {
      if (n.type !== 'featureNode') return false;
      const data = n.data as FeatureNodeData;
      return (
        data.state === 'running' || data.state === 'action-required' || data.state === 'creating'
      );
    });

    if (!hasActiveFeature) return;

    const interval = setInterval(() => {
      if (!isRefreshBlocked?.()) router.refresh();
    }, 5_000);
    return () => clearInterval(interval);
  }, [nodes, router, isRefreshBlocked]);

  const onNodesChange = useCallback((changes: NodeChange<CanvasNodeType>[]) => {
    setNodes((ns) => applyNodeChanges(changes, ns));
  }, []);

  const handleConnect = useCallback(
    (connection: Connection) => {
      if (!connection.source || !connection.target) return;

      setNodes((currentNodes) => {
        const sourceNode = currentNodes.find((n) => n.id === connection.source);
        if (sourceNode?.type !== 'repositoryNode') return currentNodes;

        // Block if target feature already has a repo source
        setEdges((currentEdges) => {
          const targetAlreadyHasRepo = currentEdges.some((e) => {
            const edgeSource = currentNodes.find((n) => n.id === e.source);
            return edgeSource?.type === 'repositoryNode' && e.target === connection.target;
          });
          if (targetAlreadyHasRepo) return currentEdges;

          return [
            ...currentEdges,
            {
              id: `edge-${connection.source}-${connection.target}`,
              source: connection.source,
              target: connection.target,
              style: { strokeDasharray: '5 5' },
            },
          ];
        });

        return currentNodes;
      });
    },
    [setEdges]
  );

  const createFeatureNode = useCallback(
    (
      sourceNodeId: string | null,
      dataOverride?: Partial<FeatureNodeData>,
      edgeType?: string
    ): string => {
      const id = `feature-${Date.now()}-${nextFeatureId++}`;
      const newFeatureData: FeatureNodeData = {
        name: dataOverride?.name ?? 'New Feature',
        description: dataOverride?.description ?? 'Describe what this feature does',
        featureId: `#${id.slice(-4)}`,
        lifecycle: 'requirements',
        state: dataOverride?.state ?? 'running',
        progress: 0,
        repositoryPath: dataOverride?.repositoryPath ?? '',
        branch: dataOverride?.branch ?? '',
      };

      setNodes((currentNodes) => {
        const newNode = {
          id,
          type: 'featureNode' as const,
          position: { x: 0, y: 0 },
          data: newFeatureData,
        } as CanvasNodeType;

        const newEdge = sourceNodeId
          ? {
              id:
                edgeType === 'dependencyEdge'
                  ? `dep-${sourceNodeId}-${id}`
                  : `edge-${sourceNodeId}-${id}`,
              source: sourceNodeId,
              target: id,
              ...(edgeType ? { type: edgeType } : { style: { strokeDasharray: '5 5' } }),
            }
          : null;

        const allEdges = newEdge
          ? [...edgesRef.current.filter((e) => e.id !== newEdge.id), newEdge]
          : edgesRef.current;

        // Insert the new node after the last sibling connected to the same source,
        // so dagre's input-order preservation keeps repo groups together.
        let insertIndex = currentNodes.length;
        if (sourceNodeId) {
          const siblingIds = new Set(
            allEdges.filter((e) => e.source === sourceNodeId).map((e) => e.target)
          );
          for (let i = currentNodes.length - 1; i >= 0; i--) {
            if (siblingIds.has(currentNodes[i].id)) {
              insertIndex = i + 1;
              break;
            }
          }
        }
        const allNodes = [
          ...currentNodes.slice(0, insertIndex),
          newNode,
          ...currentNodes.slice(insertIndex),
        ];

        // Run dagre layout on the full graph so the new node is positioned consistently
        const layoutResult = layoutWithDagre(allNodes, allEdges, CANVAS_LAYOUT_DEFAULTS);
        setEdges(layoutResult.edges);
        return layoutResult.nodes;
      });

      return id;
    },
    [setEdges]
  );

  const handleDeleteFeature = useCallback(
    (featureId: string) => {
      const nodeId = `feat-${featureId}`;

      // Snapshot current state for rollback
      const prevNodes = nodes;
      const prevEdges = edgesRef.current;

      // Optimistic removal — update UI immediately
      setNodes((currentNodes) => {
        const remainingNodes = currentNodes.filter((n) => n.id !== nodeId);
        const remainingEdges = edgesRef.current.filter(
          (e) => e.source !== nodeId && e.target !== nodeId
        );
        const layoutResult = layoutWithDagre(
          remainingNodes,
          remainingEdges,
          CANVAS_LAYOUT_DEFAULTS
        );
        setEdges(layoutResult.edges);
        return layoutResult.nodes;
      });
      deleteSound.play();
      toast.success('Feature deleted successfully');
      router.push('/');

      // Persist in background — rollback on failure
      deleteFeature(featureId)
        .then((result) => {
          if (result.error) {
            setNodes(prevNodes);
            setEdges(prevEdges);
            toast.error(result.error);
            return;
          }
          router.refresh();
        })
        .catch(() => {
          setNodes(prevNodes);
          setEdges(prevEdges);
          toast.error('Failed to delete feature');
        });
    },
    [nodes, router, deleteSound, setEdges]
  );

  const handleDeleteRepository = useCallback(
    async (repositoryId: string) => {
      const repoNodeId = `repo-${repositoryId}`;

      // Optimistic: remove repo node, its child feature nodes, and all related edges
      setNodes((currentNodes) => {
        // Find feature node IDs connected to this repo via edges
        const childFeatureIds = new Set(
          edgesRef.current.filter((e) => e.source === repoNodeId).map((e) => e.target)
        );
        const remainingNodes = currentNodes.filter(
          (n) => n.id !== repoNodeId && !childFeatureIds.has(n.id)
        );
        const remainingEdges = edgesRef.current.filter(
          (e) =>
            e.source !== repoNodeId &&
            e.target !== repoNodeId &&
            !childFeatureIds.has(e.source) &&
            !childFeatureIds.has(e.target)
        );
        const layoutResult = layoutWithDagre(
          remainingNodes,
          remainingEdges,
          CANVAS_LAYOUT_DEFAULTS
        );
        setEdges(layoutResult.edges);
        return layoutResult.nodes;
      });

      try {
        const result = await deleteRepository(repositoryId);

        if (!result.success) {
          toast.error(result.error ?? 'Failed to remove repository');
          router.refresh();
          return;
        }

        deleteSound.play();
        toast.success('Repository removed');
        router.refresh();
      } catch {
        toast.error('Failed to remove repository');
        router.refresh();
      }
    },
    [router, deleteSound, setEdges]
  );

  const handleLayout = useCallback(
    (direction: LayoutDirection) => {
      setNodes((currentNodes) => {
        const result = layoutWithDagre(currentNodes, edgesRef.current, {
          ...CANVAS_LAYOUT_DEFAULTS,
          direction,
        });
        setEdges(result.edges);
        return result.nodes;
      });
    },
    [setEdges]
  );

  const handleAddRepository = useCallback(
    (path: string) => {
      const tempId = `repo-temp-${Date.now()}`;
      const repoName =
        path
          .replace(/[\\/]+$/, '')
          .split(/[\\/]/)
          .pop() ?? path;

      // Optimistic UI: add node and re-layout immediately
      setNodes((currentNodes) => {
        const newNode = {
          id: tempId,
          type: 'repositoryNode' as const,
          position: { x: 0, y: 0 },
          data: { name: repoName, repositoryPath: path, id: tempId },
        } as CanvasNodeType;

        const allNodes = [...currentNodes, newNode];
        const layoutResult = layoutWithDagre(allNodes, edgesRef.current, CANVAS_LAYOUT_DEFAULTS);
        setEdges(layoutResult.edges);
        return layoutResult.nodes;
      });

      // Persist via server action
      addRepository({ path, name: repoName })
        .then((result) => {
          if (result.error) {
            // Rollback optimistic node and re-layout
            setNodes((prev) => {
              const remaining = prev.filter((n) => n.id !== tempId);
              const layoutResult = layoutWithDagre(
                remaining,
                edgesRef.current,
                CANVAS_LAYOUT_DEFAULTS
              );
              setEdges(layoutResult.edges);
              return layoutResult.nodes;
            });
            toast.error(result.error);
            return;
          }

          // Replace temp ID with real repository ID
          const repo = result.repository!;
          const realId = `repo-${repo.id}`;
          setNodes((prev) =>
            prev.map((n) =>
              n.id === tempId
                ? ({
                    ...n,
                    id: realId,
                    data: { ...n.data, id: repo.id, repositoryPath: repo.path },
                  } as CanvasNodeType)
                : n
            )
          );
          setEdges((prev) =>
            prev.map((e) => ({
              ...e,
              source: e.source === tempId ? realId : e.source,
              target: e.target === tempId ? realId : e.target,
              id: e.id.replace(tempId, realId),
            }))
          );

          createSound.play();
          router.refresh();
        })
        .catch(() => {
          // Rollback optimistic node and re-layout
          setNodes((prev) => {
            const remaining = prev.filter((n) => n.id !== tempId);
            const layoutResult = layoutWithDagre(
              remaining,
              edgesRef.current,
              CANVAS_LAYOUT_DEFAULTS
            );
            setEdges(layoutResult.edges);
            return layoutResult.nodes;
          });
          toast.error('Failed to add repository');
        });
    },
    [router, createSound, setEdges]
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
  };
}
