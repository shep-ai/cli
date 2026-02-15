'use client';

import { useState, useCallback, useEffect } from 'react';
import { applyNodeChanges } from '@xyflow/react';
import type { Connection, Edge, NodeChange } from '@xyflow/react';
import type { FeatureNodeData } from '@/components/common/feature-node';
import type { CanvasNodeType } from '@/components/features/features-canvas';
import { layoutWithDagre, type LayoutDirection } from '@/lib/layout-with-dagre';

export interface ControlCenterState {
  nodes: CanvasNodeType[];
  edges: Edge[];
  selectedNode: FeatureNodeData | null;
  onNodesChange: (changes: NodeChange<CanvasNodeType>[]) => void;
  handleConnect: (connection: Connection) => void;
  clearSelection: () => void;
  handleNodeClick: (event: React.MouseEvent, node: CanvasNodeType) => void;
  handleAddFeature: () => void;
  handleAddFeatureToRepo: (repoNodeId: string) => void;
  handleAddFeatureToFeature: (featureNodeId: string) => void;
  handleAddRepository: (path: string) => void;
  handleLayout: (direction: LayoutDirection) => void;
}

export function useControlCenterState(
  initialNodes: CanvasNodeType[],
  initialEdges: Edge[]
): ControlCenterState {
  const [nodes, setNodes] = useState<CanvasNodeType[]>(initialNodes);
  const [edges, setEdges] = useState<Edge[]>(initialEdges);
  const [selectedNode, setSelectedNode] = useState<FeatureNodeData | null>(null);

  const onNodesChange = useCallback((changes: NodeChange<CanvasNodeType>[]) => {
    setNodes((ns) => applyNodeChanges(changes, ns));
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedNode(null);
  }, []);

  const handleNodeClick = useCallback((_event: React.MouseEvent, node: CanvasNodeType) => {
    if (node.type === 'featureNode') {
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

  const createFeatureNode = useCallback((sourceNodeId: string | null) => {
    const id = `feature-${Date.now()}`;
    const newFeatureData: FeatureNodeData = {
      name: 'New Feature',
      description: 'Describe what this feature does',
      featureId: `#${id.slice(-4)}`,
      lifecycle: 'requirements',
      state: 'running',
      progress: 0,
    };

    setNodes((currentNodes) => {
      let position = { x: 400, y: 200 };

      if (sourceNodeId) {
        const sourceNode = currentNodes.find((n) => n.id === sourceNodeId);
        if (sourceNode) {
          // Position to the right of source, offset vertically for each child
          const existingChildren = currentNodes.filter(
            (n) => n.type === 'featureNode' && n.position.x === sourceNode.position.x + 280
          );
          position = {
            x: sourceNode.position.x + 280,
            y: sourceNode.position.y + existingChildren.length * 160,
          };
        }
      }

      const newNode = {
        id,
        type: 'featureNode' as const,
        position,
        data: newFeatureData,
      } as CanvasNodeType;

      return [...currentNodes, newNode];
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
  }, []);

  const handleAddFeature = useCallback(() => {
    createFeatureNode(null);
  }, [createFeatureNode]);

  const handleAddFeatureToRepo = useCallback(
    (repoNodeId: string) => {
      createFeatureNode(repoNodeId);
    },
    [createFeatureNode]
  );

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
        data: { name: path },
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

  return {
    nodes,
    edges,
    selectedNode,
    onNodesChange,
    handleConnect,
    clearSelection,
    handleNodeClick,
    handleAddFeature,
    handleAddFeatureToRepo,
    handleAddFeatureToFeature,
    handleAddRepository,
    handleLayout,
  };
}
