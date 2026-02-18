'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { applyNodeChanges } from '@xyflow/react';
import type { Connection, Edge, NodeChange } from '@xyflow/react';
import type { FeatureNodeData } from '@/components/common/feature-node';
import type { CreateFeatureInput } from '@shepai/core/infrastructure/di/use-cases-bridge';
import type { CanvasNodeType } from '@/components/features/features-canvas';
import { layoutWithDagre, type LayoutDirection } from '@/lib/layout-with-dagre';

export interface ControlCenterState {
  nodes: CanvasNodeType[];
  edges: Edge[];
  selectedNode: FeatureNodeData | null;
  isCreateDrawerOpen: boolean;
  isSubmitting: boolean;
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
  handleCreateFeatureSubmit: (data: CreateFeatureInput) => void;
  closeCreateDrawer: () => void;
}

let nextFeatureId = 0;

export function useControlCenterState(
  initialNodes: CanvasNodeType[],
  initialEdges: Edge[]
): ControlCenterState {
  const router = useRouter();
  const [nodes, setNodes] = useState<CanvasNodeType[]>(initialNodes);
  const [edges, setEdges] = useState<Edge[]>(initialEdges);
  const [selectedNode, setSelectedNode] = useState<FeatureNodeData | null>(null);
  const [isCreateDrawerOpen, setIsCreateDrawerOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pendingRepoNodeId, setPendingRepoNodeId] = useState<string | null>(null);

  const onNodesChange = useCallback((changes: NodeChange<CanvasNodeType>[]) => {
    setNodes((ns) => applyNodeChanges(changes, ns));
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedNode(null);
  }, []);

  const handleNodeClick = useCallback((_event: React.MouseEvent, node: CanvasNodeType) => {
    if (node.type === 'featureNode') {
      setIsCreateDrawerOpen(false);
      setSelectedNode(node.data as FeatureNodeData);
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

  const handleConnect = useCallback((connection: Connection) => {
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
  }, []);

  const createFeatureNode = useCallback(
    (sourceNodeId: string | null, dataOverride?: Partial<FeatureNodeData>) => {
      const id = `feature-${Date.now()}-${nextFeatureId++}`;
      const newFeatureData: FeatureNodeData = {
        name: dataOverride?.name ?? 'New Feature',
        description: dataOverride?.description ?? 'Describe what this feature does',
        featureId: `#${id.slice(-4)}`,
        lifecycle: 'requirements',
        state: 'running',
        progress: 0,
        repositoryPath: dataOverride?.repositoryPath ?? '',
        branch: dataOverride?.branch ?? '',
      };

      setNodes((currentNodes) => {
        // Find siblings connected to the same parent
        const siblingIds = sourceNodeId
          ? new Set(edges.filter((e) => e.source === sourceNodeId).map((e) => e.target))
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
          // Parent width + consistent 56px gap (repo: 224+56=280, feature: 288+56=344)
          const xOffset = parent?.type === 'featureNode' ? 344 : 280;
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

      setSelectedNode(newFeatureData);
    },
    [edges]
  );

  const handleAddFeature = useCallback(() => {
    setSelectedNode(null);
    setIsCreateDrawerOpen(true);
  }, []);

  const handleCreateFeatureSubmit = useCallback(
    async (data: CreateFeatureInput) => {
      setIsSubmitting(true);
      try {
        const response = await fetch('/api/features/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });

        if (!response.ok) {
          const body = await response.json();
          toast.error(body.error ?? 'Failed to create feature');
          return;
        }

        setIsCreateDrawerOpen(false);
        setPendingRepoNodeId(null);
        toast.success('Feature created successfully');
        router.refresh();
      } catch {
        toast.error('Failed to create feature');
      } finally {
        setIsSubmitting(false);
      }
    },
    [router]
  );

  const closeCreateDrawer = useCallback(() => {
    setIsCreateDrawerOpen(false);
  }, []);

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
    [edges]
  );

  const handleAddRepository = useCallback((path: string) => {
    const id = `repo-${Date.now()}`;

    setNodes((currentNodes) => {
      const addRepoNode = currentNodes.find((n) => n.type === 'addRepositoryNode');
      const position = addRepoNode
        ? { x: addRepoNode.position.x, y: addRepoNode.position.y }
        : { x: 50, y: 50 };

      const newNode = {
        id,
        type: 'repositoryNode' as const,
        position,
        data: {
          name:
            path
              .replace(/[\\/]+$/, '')
              .split(/[\\/]/)
              .pop() ?? path,
        },
      } as CanvasNodeType;

      // Shift the add-repo node down
      return currentNodes
        .map((n) =>
          n.type === 'addRepositoryNode'
            ? { ...n, position: { ...n.position, y: n.position.y + 80 } }
            : n
        )
        .concat(newNode);
    });
  }, []);

  const pendingRepositoryPath = pendingRepoNodeId?.replace(/^repo-/, '') ?? '';

  return {
    nodes,
    edges,
    selectedNode,
    isCreateDrawerOpen,
    isSubmitting,
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
  };
}
