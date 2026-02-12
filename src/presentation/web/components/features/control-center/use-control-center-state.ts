'use client';

import { useState, useCallback, useEffect } from 'react';
import { useReactFlow, useOnSelectionChange } from '@xyflow/react';
import type { Node } from '@xyflow/react';
import type { FeatureNodeData } from '@/components/common/feature-node';

export interface ControlCenterState {
  selectedNode: FeatureNodeData | null;
  clearSelection: () => void;
  handleAddFeature: () => void;
  handleAddFeatureToRepo: (repoNodeId: string) => void;
  handleAddFeatureToFeature: (featureNodeId: string) => void;
}

export function useControlCenterState(): ControlCenterState {
  const [selectedNode, setSelectedNode] = useState<FeatureNodeData | null>(null);
  const { addNodes, addEdges, getNode, setNodes } = useReactFlow();

  const clearSelection = useCallback(() => {
    setSelectedNode(null);
    setNodes((nodes) => nodes.map((n) => ({ ...n, selected: false })));
  }, [setNodes]);

  // Track selection changes from React Flow
  useOnSelectionChange({
    onChange: useCallback(({ nodes }: { nodes: Node[] }) => {
      const featureNode = nodes.find((n) => n.type === 'featureNode');
      if (featureNode) {
        setSelectedNode(featureNode.data as FeatureNodeData);
      } else {
        setSelectedNode(null);
      }
    }, []),
  });

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

  const createFeatureNode = useCallback(
    (sourceNodeId: string | null) => {
      const id = `feature-${Date.now()}`;
      let position = { x: 400, y: 200 };

      if (sourceNodeId) {
        const sourceNode = getNode(sourceNodeId);
        if (sourceNode) {
          position = { x: sourceNode.position.x + 350, y: sourceNode.position.y };
        }
      }

      const newNode: Node<FeatureNodeData> = {
        id,
        type: 'featureNode',
        position,
        selected: true,
        data: {
          name: 'New Feature',
          featureId: `#${id.slice(-4)}`,
          lifecycle: 'requirements',
          state: 'running',
          progress: 0,
        },
      };

      addNodes(newNode);

      if (sourceNodeId) {
        addEdges({
          id: `edge-${sourceNodeId}-${id}`,
          source: sourceNodeId,
          target: id,
          style: { strokeDasharray: '5 5' },
        });
      }

      // Auto-select the new node
      setSelectedNode(newNode.data as FeatureNodeData);
    },
    [addNodes, addEdges, getNode]
  );

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

  return {
    selectedNode,
    clearSelection,
    handleAddFeature,
    handleAddFeatureToRepo,
    handleAddFeatureToFeature,
  };
}
