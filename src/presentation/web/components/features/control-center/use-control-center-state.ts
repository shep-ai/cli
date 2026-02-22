'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { applyNodeChanges } from '@xyflow/react';
import type { Connection, Edge, NodeChange } from '@xyflow/react';
import type { FeatureNodeData } from '@/components/common/feature-node';
import type { FeatureCreatePayload } from '@/components/common/feature-create-drawer';
import type { CanvasNodeType } from '@/components/features/features-canvas';
import { layoutWithDagre, type LayoutDirection } from '@/lib/layout-with-dagre';
import { createFeature } from '@/app/actions/create-feature';
import { deleteFeature } from '@/app/actions/delete-feature';
import { addRepository } from '@/app/actions/add-repository';
import { deleteRepository } from '@/app/actions/delete-repository';
import { useAgentEventsContext } from '@/hooks/agent-events-provider';

export interface ControlCenterState {
  nodes: CanvasNodeType[];
  edges: Edge[];
  selectedNode: FeatureNodeData | null;
  isCreateDrawerOpen: boolean;
  pendingRepositoryPath: string;
  onNodesChange: (changes: NodeChange<CanvasNodeType>[]) => void;
  handleConnect: (connection: Connection) => void;
  clearSelection: () => void;
  handleNodeClick: (event: React.MouseEvent, node: CanvasNodeType) => void;
  handleAddFeature: () => void;
  handleAddFeatureToRepo: (repoNodeId: string) => void;
  handleAddFeatureToFeature: (featureNodeId: string) => void;
  handleAddRepository: (path: string) => void;
  handleLayout: (direction: LayoutDirection) => void;
  handleCreateFeatureSubmit: (data: FeatureCreatePayload) => void;
  closeCreateDrawer: () => void;
  handleDeleteFeature: (featureId: string) => Promise<void>;
  handleDeleteRepository: (repositoryId: string) => Promise<void>;
  isDeleting: boolean;
  createFeatureNode: (
    sourceNodeId: string | null,
    dataOverride?: Partial<FeatureNodeData>
  ) => string;
}

let nextFeatureId = 0;

export function useControlCenterState(
  initialNodes: CanvasNodeType[],
  initialEdges: Edge[]
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
  const [selectedNode, setSelectedNode] = useState<FeatureNodeData | null>(null);
  const [isCreateDrawerOpen, setIsCreateDrawerOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [pendingRepoNodeId, setPendingRepoNodeId] = useState<string | null>(null);

  // Sync server props into local state when router.refresh() delivers new data
  const initialNodeKey = initialNodes
    .map((n) => n.id)
    .sort()
    .join(',');
  const initialEdgeKey = initialEdges
    .map((e) => e.id)
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

      // Merge server nodes with client positions
      return initialNodes.map((serverNode) => {
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

        // Truly new node with no optimistic counterpart — use server position
        return serverNode;
      });
    });
  }, [initialNodeKey, initialNodes]);

  useEffect(() => {
    setEdges(initialEdges);
  }, [initialEdgeKey, initialEdges, setEdges]);

  // Refresh server data when SSE agent events arrive (status changes)
  const { lastEvent } = useAgentEventsContext();
  const processedEventRef = useRef<string | null>(null);

  useEffect(() => {
    if (!lastEvent) return;
    const key = `${lastEvent.agentRunId}-${lastEvent.eventType}-${lastEvent.timestamp}`;
    if (processedEventRef.current === key) return;
    processedEventRef.current = key;
    router.refresh();
  }, [lastEvent, router]);

  const onNodesChange = useCallback((changes: NodeChange<CanvasNodeType>[]) => {
    setNodes((ns) => applyNodeChanges(changes, ns));
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedNode(null);
  }, []);

  const handleNodeClick = useCallback((_event: React.MouseEvent, node: CanvasNodeType) => {
    if (node.type === 'featureNode') {
      const data = node.data as FeatureNodeData;
      if (data.state === 'creating') return;
      setIsCreateDrawerOpen(false);
      setSelectedNode(data);
    }
  }, []);

  // Keyboard shortcut: Escape to deselect
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        clearSelection();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [clearSelection]);

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
    (sourceNodeId: string | null, dataOverride?: Partial<FeatureNodeData>): string => {
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
        // Read edges from ref to avoid closure dependency on `edges` state.
        // edgesRef is kept in sync by the setEdges wrapper.
        const siblingIds = sourceNodeId
          ? new Set(edgesRef.current.filter((e) => e.source === sourceNodeId).map((e) => e.target))
          : new Set<string>();
        const siblings = currentNodes.filter((n) => siblingIds.has(n.id));

        let position: { x: number; y: number };

        if (siblings.length > 0) {
          // Place below the bottom-most sibling, matching X
          const sortedYs = siblings.map((n) => n.position.y).sort((a, b) => a - b);
          const maxY = sortedYs[sortedYs.length - 1];
          // Derive gap from existing spacing between siblings, or use default
          const gap = sortedYs.length > 1 ? sortedYs[1] - sortedYs[0] : 160;
          position = { x: siblings[0].position.x, y: maxY + gap };
        } else if (sourceNodeId) {
          // First child — position to the right of parent
          const parent = currentNodes.find((n) => n.id === sourceNodeId);
          // Parent width (288) + 200px gap matching dagre ranksep
          const xOffset = 488;
          position = parent
            ? { x: parent.position.x + xOffset, y: parent.position.y }
            : { x: 400, y: 200 };
        } else {
          // Standalone feature — place below all existing nodes
          const maxY =
            currentNodes.length > 0 ? Math.max(...currentNodes.map((n) => n.position.y)) : 0;
          position = { x: 400, y: currentNodes.length > 0 ? maxY + 160 : 200 };
        }

        // The new node's bottom edge (featureNode height = 140)
        const newBottom = position.y + 140;

        // Find the old group bottom before adding the new node
        const groupNodeIds = new Set([sourceNodeId, ...siblingIds]);
        const oldGroupBottom = currentNodes
          .filter((n) => groupNodeIds.has(n.id))
          .reduce((max, n) => {
            const h = n.type === 'featureNode' ? 140 : 50;
            return Math.max(max, n.position.y + h);
          }, 0);

        // Shift amount: how much the group grew past its old bottom
        const shift = Math.max(0, newBottom - oldGroupBottom);

        // Push down all nodes that are below the old group bottom
        const shifted =
          shift > 0
            ? currentNodes.map((n) => {
                if (groupNodeIds.has(n.id) || siblingIds.has(n.id)) return n;
                if (n.position.y >= oldGroupBottom) {
                  return { ...n, position: { ...n.position, y: n.position.y + shift } };
                }
                return n;
              })
            : currentNodes;

        // Re-center the parent node vertically to its children
        const recentered = sourceNodeId
          ? shifted.map((n) => {
              if (n.id !== sourceNodeId) return n;
              const allChildYs = [...siblings.map((s) => s.position.y), position.y];
              const groupCenter = (Math.min(...allChildYs) + Math.max(...allChildYs) + 140) / 2;
              const parentHeight = n.type === 'featureNode' ? 140 : 50;
              return {
                ...n,
                position: { ...n.position, y: groupCenter - parentHeight / 2 },
              };
            })
          : shifted;

        return [
          ...recentered,
          {
            id,
            type: 'featureNode' as const,
            position,
            data: newFeatureData,
          } as CanvasNodeType,
        ];
      });

      if (sourceNodeId) {
        setEdges((currentEdges) => [
          ...currentEdges,
          {
            id: `edge-${sourceNodeId}-${id}`,
            source: sourceNodeId,
            target: id,
            style: { strokeDasharray: '5 5' },
          },
        ]);
      }

      if (newFeatureData.state !== 'creating') {
        setSelectedNode(newFeatureData);
      }

      return id;
    },
    [setEdges]
  );

  const handleAddFeature = useCallback(() => {
    setSelectedNode(null);
    setIsCreateDrawerOpen(true);
  }, []);

  const handleCreateFeatureSubmit = useCallback(
    (data: FeatureCreatePayload) => {
      // 1. Insert optimistic node instantly
      const tempId = createFeatureNode(pendingRepoNodeId, {
        state: 'creating',
        name: data.name,
        description: data.description,
        repositoryPath: data.repositoryPath,
      });

      // 2. Close drawer and clear pending state immediately
      setIsCreateDrawerOpen(false);
      setPendingRepoNodeId(null);

      // 3. Fire server action in the background
      createFeature(data)
        .then((result) => {
          if (result.error) {
            // Rollback: remove optimistic node and edge
            setNodes((prev) => prev.filter((n) => n.id !== tempId));
            setEdges((prev) => prev.filter((e) => e.target !== tempId));
            toast.error(result.error);
            return;
          }

          router.refresh();
        })
        .catch(() => {
          // Rollback: remove optimistic node and edge
          setNodes((prev) => prev.filter((n) => n.id !== tempId));
          setEdges((prev) => prev.filter((e) => e.target !== tempId));
          toast.error('Failed to create feature');
        });
    },
    [router, createFeatureNode, pendingRepoNodeId, setEdges]
  );

  const closeCreateDrawer = useCallback(() => {
    setIsCreateDrawerOpen(false);
  }, []);

  const handleDeleteFeature = useCallback(
    async (featureId: string) => {
      setIsDeleting(true);
      try {
        const result = await deleteFeature(featureId);

        if (result.error) {
          toast.error(result.error);
          return;
        }

        setSelectedNode(null);
        setNodes((currentNodes) => {
          const remainingNodes = currentNodes.filter((n) => n.id !== featureId);
          const remainingEdges = edges.filter(
            (e) => e.source !== featureId && e.target !== featureId
          );
          const result = layoutWithDagre(remainingNodes, remainingEdges, {
            direction: 'LR',
            ranksep: 200,
            nodesep: 60,
          });
          setEdges(result.edges);
          return result.nodes;
        });
        toast.success('Feature deleted successfully');
        router.refresh();
      } catch {
        toast.error('Failed to delete feature');
      } finally {
        setIsDeleting(false);
      }
    },
    [router, edges]
  );

  const handleDeleteRepository = useCallback(
    async (repositoryId: string) => {
      const repoNodeId = `repo-${repositoryId}`;

      // Optimistic: remove node and its edges immediately
      setNodes((prev) => prev.filter((n) => n.id !== repoNodeId));
      setEdges((prev) => prev.filter((e) => e.source !== repoNodeId && e.target !== repoNodeId));

      try {
        const result = await deleteRepository(repositoryId);

        if (!result.success) {
          toast.error(result.error ?? 'Failed to remove repository');
          router.refresh();
          return;
        }

        toast.success('Repository removed');
        router.refresh();
      } catch {
        toast.error('Failed to remove repository');
        router.refresh();
      }
    },
    [router]
  );

  const handleAddFeatureToRepo = useCallback((repoNodeId: string) => {
    setSelectedNode(null);
    setPendingRepoNodeId(repoNodeId);
    setIsCreateDrawerOpen(true);
  }, []);

  const handleAddFeatureToFeature = useCallback(
    (featureNodeId: string) => {
      createFeatureNode(featureNodeId);
    },
    [createFeatureNode]
  );

  const handleLayout = useCallback(
    (direction: LayoutDirection) => {
      setNodes((currentNodes) => {
        const currentEdges = edges;
        const result = layoutWithDagre(currentNodes, currentEdges, {
          direction,
          ranksep: 60,
          nodesep: 20,
        });
        setEdges(result.edges);
        return result.nodes;
      });
    },
    [edges, setEdges]
  );

  const handleAddRepository = useCallback(
    (path: string) => {
      const tempId = `repo-temp-${Date.now()}`;
      const repoName =
        path
          .replace(/[\\/]+$/, '')
          .split(/[\\/]/)
          .pop() ?? path;

      // Optimistic UI: add node immediately
      let savedAddRepoY = 0;
      setNodes((currentNodes) => {
        const repoNodes = currentNodes.filter((n) => n.type === 'repositoryNode');
        const addRepoNode = currentNodes.find((n) => n.type === 'addRepositoryNode');

        // Save addRepoNode's original Y for rollback on error
        if (addRepoNode) savedAddRepoY = addRepoNode.position.y;

        // Place in the repo column, at the addRepoNode's current position
        const repoX = repoNodes[0]?.position.x ?? addRepoNode?.position.x ?? 50;
        const repoHeight = 50; // repositoryNode height
        const gap = 15; // match dagre nodesep

        const position = {
          x: repoX,
          y: addRepoNode ? addRepoNode.position.y : 0,
        };

        const newNode = {
          id: tempId,
          type: 'repositoryNode' as const,
          position,
          data: { name: repoName, repositoryPath: path, id: tempId },
        } as CanvasNodeType;

        // Shift addRepo button down by exactly one slot
        const addRepoY = addRepoNode
          ? addRepoNode.position.y + repoHeight + gap
          : position.y + repoHeight + gap;

        return currentNodes
          .map((n) =>
            n.type === 'addRepositoryNode' ? { ...n, position: { ...n.position, y: addRepoY } } : n
          )
          .concat(newNode);
      });

      // Persist via server action
      addRepository({ path, name: repoName })
        .then((result) => {
          if (result.error) {
            // Rollback optimistic node and restore addRepoNode position
            setNodes((prev) =>
              prev
                .filter((n) => n.id !== tempId)
                .map((n) =>
                  n.type === 'addRepositoryNode'
                    ? { ...n, position: { ...n.position, y: savedAddRepoY } }
                    : n
                )
            );
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

          router.refresh();
        })
        .catch(() => {
          // Rollback optimistic node and restore addRepoNode position
          setNodes((prev) =>
            prev
              .filter((n) => n.id !== tempId)
              .map((n) =>
                n.type === 'addRepositoryNode'
                  ? { ...n, position: { ...n.position, y: savedAddRepoY } }
                  : n
              )
          );
          toast.error('Failed to add repository');
        });
    },
    [router]
  );

  const pendingNode = pendingRepoNodeId ? nodes.find((n) => n.id === pendingRepoNodeId) : null;
  const pendingRepositoryPath =
    (pendingNode?.data as { repositoryPath?: string } | undefined)?.repositoryPath ?? '';

  return {
    nodes,
    edges,
    selectedNode,
    isCreateDrawerOpen,
    pendingRepositoryPath,
    onNodesChange,
    handleConnect,
    clearSelection,
    handleNodeClick,
    handleAddFeature,
    handleAddFeatureToRepo,
    handleAddFeatureToFeature,
    handleAddRepository,
    handleLayout,
    handleCreateFeatureSubmit,
    closeCreateDrawer,
    handleDeleteFeature,
    handleDeleteRepository,
    isDeleting,
    createFeatureNode,
  };
}
