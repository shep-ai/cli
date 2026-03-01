'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { applyNodeChanges } from '@xyflow/react';
import type { Connection, Edge, NodeChange } from '@xyflow/react';
import type { FeatureNodeData } from '@/components/common/feature-node';
import type { CanvasNodeType } from '@/components/features/features-canvas';
import { layoutWithDagre, type LayoutDirection } from '@/lib/layout-with-dagre';

export interface UseCanvasStateOptions {
  initialNodes: CanvasNodeType[];
  initialEdges: Edge[];
}

export interface UseCanvasStateResult {
  nodes: CanvasNodeType[];
  edges: Edge[];
  setNodes: React.Dispatch<React.SetStateAction<CanvasNodeType[]>>;
  setEdges: (update: Edge[] | ((prev: Edge[]) => Edge[])) => void;
  onNodesChange: (changes: NodeChange<CanvasNodeType>[]) => void;
  handleConnect: (connection: Connection) => void;
  handleLayout: (direction: LayoutDirection) => void;
  createFeatureNode: (
    sourceNodeId: string | null,
    dataOverride?: Partial<FeatureNodeData>,
    edgeType?: string
  ) => string;
  /** Remove a node by ID. */
  removeNode: (nodeId: string) => void;
  /** Remove all edges connected to a node (as source or target). */
  removeEdge: (nodeId: string) => void;
  /** Ref-based access to current edges (for closure-safe reads). */
  edgesRef: React.MutableRefObject<Edge[]>;
}

let nextFeatureId = 0;

/**
 * Manages all React Flow-specific state: nodes, edges, layout, connections,
 * and the auto-positioning logic for new feature nodes.
 *
 * Only mounted when the Map tab is active. Server prop sync effects
 * keep local state in sync with router.refresh() deliveries.
 */
export function useCanvasState({
  initialNodes,
  initialEdges,
}: UseCanvasStateOptions): UseCanvasStateResult {
  const router = useRouter();
  const [nodes, setNodes] = useState<CanvasNodeType[]>(initialNodes);
  // eslint-disable-next-line react/hook-use-state -- raw setter renamed; public setEdges wrapper keeps edgesRef in sync
  const [edges, setEdgesRaw] = useState<Edge[]>(initialEdges);
  const edgesRef = useRef<Edge[]>(initialEdges);

  // Wrapper that keeps edgesRef in sync with edges state
  const setEdges = useCallback((update: Edge[] | ((prev: Edge[]) => Edge[])) => {
    setEdgesRaw((prev) => {
      const next = typeof update === 'function' ? update(prev) : update;
      edgesRef.current = next;
      return next;
    });
  }, []);

  // Sync server props into local state when router.refresh() delivers new data
  const initialNodeKey = initialNodes
    .map((n) => n.id)
    .sort()
    .join(',');
  const initialEdgeKey = initialEdges
    .map((e) => e.id)
    .sort()
    .join(',');

  useEffect(() => {
    setNodes((currentNodes) => {
      const currentById = new Map(currentNodes.map((n) => [n.id, n]));
      const serverIds = new Set(initialNodes.map((n) => n.id));
      const creatingNodes = currentNodes.filter(
        (n) =>
          n.type === 'featureNode' &&
          (n.data as FeatureNodeData).state === 'creating' &&
          !serverIds.has(n.id)
      );

      return initialNodes.map((serverNode) => {
        const existing = currentById.get(serverNode.id);
        if (existing) {
          return { ...serverNode, position: existing.position };
        }

        if (serverNode.type === 'featureNode' && creatingNodes.length > 0) {
          const donor = creatingNodes.shift()!;
          return { ...serverNode, position: donor.position };
        }

        return serverNode;
      });
    });
  }, [initialNodeKey, initialNodes]);

  useEffect(() => {
    setEdges(initialEdges);
  }, [initialEdgeKey, initialEdges, setEdges]);

  // Periodic polling fallback: refresh server data every 5s when any feature
  // is in an active state (running/action-required/creating).
  useEffect(() => {
    const hasActiveFeature = nodes.some((n) => {
      if (n.type !== 'featureNode') return false;
      const data = n.data as FeatureNodeData;
      return (
        data.state === 'running' || data.state === 'action-required' || data.state === 'creating'
      );
    });

    if (!hasActiveFeature) return;

    const interval = setInterval(() => router.refresh(), 5_000);
    return () => clearInterval(interval);
  }, [nodes, router]);

  const onNodesChange = useCallback((changes: NodeChange<CanvasNodeType>[]) => {
    setNodes((ns) => applyNodeChanges(changes, ns));
  }, []);

  const handleConnect = useCallback(
    (connection: Connection) => {
      if (!connection.source || !connection.target) return;

      setNodes((currentNodes) => {
        const sourceNode = currentNodes.find((n) => n.id === connection.source);
        if (sourceNode?.type !== 'repositoryNode') return currentNodes;

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
        const siblingIds = sourceNodeId
          ? new Set(edgesRef.current.filter((e) => e.source === sourceNodeId).map((e) => e.target))
          : new Set<string>();
        const siblings = currentNodes.filter((n) => siblingIds.has(n.id));

        let position: { x: number; y: number };

        if (siblings.length > 0) {
          const sortedYs = siblings.map((n) => n.position.y).sort((a, b) => a - b);
          const maxY = sortedYs[sortedYs.length - 1];
          const gap = sortedYs.length > 1 ? sortedYs[1] - sortedYs[0] : 160;
          position = { x: siblings[0].position.x, y: maxY + gap };
        } else if (sourceNodeId) {
          const parent = currentNodes.find((n) => n.id === sourceNodeId);
          const xOffset = 488;
          position = parent
            ? { x: parent.position.x + xOffset, y: parent.position.y }
            : { x: 400, y: 200 };
        } else {
          const maxY =
            currentNodes.length > 0 ? Math.max(...currentNodes.map((n) => n.position.y)) : 0;
          position = { x: 400, y: currentNodes.length > 0 ? maxY + 160 : 200 };
        }

        const newBottom = position.y + 140;
        const groupNodeIds = new Set([sourceNodeId, ...siblingIds]);
        const oldGroupBottom = currentNodes
          .filter((n) => groupNodeIds.has(n.id))
          .reduce((max, n) => {
            const h = n.type === 'featureNode' ? 140 : 50;
            return Math.max(max, n.position.y + h);
          }, 0);

        const shift = Math.max(0, newBottom - oldGroupBottom);

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
            id:
              edgeType === 'dependencyEdge'
                ? `dep-${sourceNodeId}-${id}`
                : `edge-${sourceNodeId}-${id}`,
            source: sourceNodeId,
            target: id,
            ...(edgeType ? { type: edgeType } : { style: { strokeDasharray: '5 5' } }),
          },
        ]);
      }

      return id;
    },
    [setEdges]
  );

  const handleLayout = useCallback(
    (direction: LayoutDirection) => {
      setNodes((currentNodes) => {
        const currentEdges = edgesRef.current;
        const result = layoutWithDagre(currentNodes, currentEdges, {
          direction,
          ranksep: 60,
          nodesep: 20,
        });
        setEdges(result.edges);
        return result.nodes;
      });
    },
    [setEdges]
  );

  const removeNode = useCallback((nodeId: string) => {
    setNodes((prev) => prev.filter((n) => n.id !== nodeId));
  }, []);

  const removeEdge = useCallback(
    (nodeId: string) => {
      setEdges((prev) => prev.filter((e) => e.source !== nodeId && e.target !== nodeId));
    },
    [setEdges]
  );

  return {
    nodes,
    edges,
    setNodes,
    setEdges,
    onNodesChange,
    handleConnect,
    handleLayout,
    createFeatureNode,
    removeNode,
    removeEdge,
    edgesRef,
  };
}
