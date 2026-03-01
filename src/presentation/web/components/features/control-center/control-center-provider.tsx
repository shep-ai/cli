'use client';

import { createContext, useContext, useCallback, useMemo, type ReactNode } from 'react';
import type { Edge, NodeChange, Connection } from '@xyflow/react';
import type { FeatureNodeData, FeatureLifecyclePhase } from '@/components/common/feature-node';
import type { FeatureCreatePayload } from '@/components/common/feature-create-drawer';
import type { CanvasNodeType } from '@/components/features/features-canvas';
import type { LayoutDirection } from '@/lib/layout-with-dagre';
import { useFeatureSelection } from '@/hooks/use-feature-selection';
import { useFeatureSSE } from '@/hooks/use-feature-sse';
import { useOptimisticUpdates, type CreateFeatureContext } from '@/hooks/use-optimistic-updates';
import { useCanvasState } from '@/hooks/use-canvas-state';

export interface ControlCenterContextValue {
  // Selection
  selectedNode: FeatureNodeData | null;
  setSelectedNode: React.Dispatch<React.SetStateAction<FeatureNodeData | null>>;
  clearSelection: () => void;
  handleNodeClick: (data: FeatureNodeData) => void;
  selectFeatureById: (featureId: string) => void;

  // Canvas state (React Flow)
  nodes: CanvasNodeType[];
  edges: Edge[];
  setNodes: React.Dispatch<React.SetStateAction<CanvasNodeType[]>>;
  onNodesChange: (changes: NodeChange<CanvasNodeType>[]) => void;
  handleConnect: (connection: Connection) => void;
  handleLayout: (direction: LayoutDirection) => void;
  createFeatureNode: (
    sourceNodeId: string | null,
    dataOverride?: Partial<FeatureNodeData>,
    edgeType?: string
  ) => string;

  // Optimistic CRUD
  handleCreateFeatureSubmit: (data: FeatureCreatePayload, context: CreateFeatureContext) => void;
  handleDeleteFeature: (featureId: string) => Promise<void>;
  handleDeleteRepository: (repositoryId: string) => Promise<void>;
  handleAddRepository: (path: string) => void;
  isDeleting: boolean;
}

const ControlCenterContext = createContext<ControlCenterContextValue | null>(null);

interface ControlCenterProviderProps {
  initialNodes: CanvasNodeType[];
  initialEdges: Edge[];
  children: ReactNode;
}

/**
 * Composes the focused hooks and provides shared state to both Board and Map views.
 * Follows the AgentEventsProvider pattern.
 */
export function ControlCenterProvider({
  initialNodes,
  initialEdges,
  children,
}: ControlCenterProviderProps) {
  // Canvas state (nodes, edges, layout, connections)
  const canvas = useCanvasState({ initialNodes, initialEdges });

  // Extract FeatureNodeData list for selection tracking and SSE fallback
  const featureDataList = useMemo(
    () =>
      canvas.nodes.filter((n) => n.type === 'featureNode').map((n) => n.data as FeatureNodeData),
    [canvas.nodes]
  );

  // Selection state
  const selection = useFeatureSelection({
    trackedFeatures: featureDataList,
  });

  // SSE event processing — updates nodes and selection
  const updateFeature = useCallback(
    (
      featureId: string,
      newState: FeatureNodeData['state'],
      newLifecycle: FeatureLifecyclePhase | undefined
    ) => {
      canvas.setNodes((prev) =>
        prev.map((node) => {
          if (node.type !== 'featureNode') return node;
          const data = node.data as FeatureNodeData;
          if (data.featureId !== featureId) return node;
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
    },
    [canvas]
  );

  const updateSelection = useCallback(
    (
      featureId: string,
      newState: FeatureNodeData['state'],
      newLifecycle: FeatureLifecyclePhase | undefined
    ) => {
      selection.setSelectedNode((prev) => {
        if (prev?.featureId !== featureId) return prev;
        return {
          ...prev,
          state: newState,
          ...(newLifecycle !== undefined && { lifecycle: newLifecycle }),
        };
      });
    },
    [selection]
  );

  useFeatureSSE({
    updateFeature,
    updateSelection,
    initialFeatures: featureDataList,
  });

  // Optimistic CRUD operations
  const optimistic = useOptimisticUpdates({
    createFeatureNode: canvas.createFeatureNode,
    removeNode: canvas.removeNode,
    removeEdge: canvas.removeEdge,
    clearSelection: selection.clearSelection,
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    setIsCreateDrawerOpen: () => {}, // Drawer state stays in ControlCenterInner
  });

  const value = useMemo<ControlCenterContextValue>(
    () => ({
      // Selection
      selectedNode: selection.selectedNode,
      setSelectedNode: selection.setSelectedNode,
      clearSelection: selection.clearSelection,
      handleNodeClick: selection.handleNodeClick,
      selectFeatureById: selection.selectFeatureById,

      // Canvas
      nodes: canvas.nodes,
      edges: canvas.edges,
      setNodes: canvas.setNodes,
      onNodesChange: canvas.onNodesChange,
      handleConnect: canvas.handleConnect,
      handleLayout: canvas.handleLayout,
      createFeatureNode: canvas.createFeatureNode,

      // CRUD
      handleCreateFeatureSubmit: optimistic.handleCreateFeatureSubmit,
      handleDeleteFeature: optimistic.handleDeleteFeature,
      handleDeleteRepository: optimistic.handleDeleteRepository,
      handleAddRepository: optimistic.handleAddRepository,
      isDeleting: optimistic.isDeleting,
    }),
    [selection, canvas, optimistic]
  );

  return <ControlCenterContext.Provider value={value}>{children}</ControlCenterContext.Provider>;
}

export function useControlCenterContext(): ControlCenterContextValue {
  const ctx = useContext(ControlCenterContext);
  if (!ctx) {
    throw new Error('useControlCenterContext must be used within a <ControlCenterProvider>');
  }
  return ctx;
}
