'use client';

import { useMemo } from 'react';
import { ReactFlow, Background, Controls } from '@xyflow/react';
import type { Connection, Edge, NodeChange } from '@xyflow/react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/common/empty-state';
import { FeatureNode } from '@/components/common/feature-node';
import type { FeatureNodeType, FeatureNodeData } from '@/components/common/feature-node';
import { RepositoryNode } from '@/components/common/repository-node';
import type { RepositoryNodeType } from '@/components/common/repository-node';
import { DependencyEdge } from './dependency-edge';

export type CanvasNodeType = FeatureNodeType | RepositoryNodeType;

export interface FeaturesCanvasProps {
  nodes: CanvasNodeType[];
  edges: Edge[];
  selectedFeatureId?: string | null;
  onNodesChange?: (changes: NodeChange<CanvasNodeType>[]) => void;
  onAddFeature?: () => void;
  onNodeClick?: (event: React.MouseEvent, node: CanvasNodeType) => void;
  onPaneClick?: (event: React.MouseEvent) => void;
  onConnect?: (connection: Connection) => void;
  onCanvasDrag?: () => void;
  toolbar?: React.ReactNode;
  emptyState?: React.ReactNode;
}

export function FeaturesCanvas({
  nodes,
  edges,
  selectedFeatureId,
  onNodesChange,
  onAddFeature,
  onConnect,
  onNodeClick,
  onPaneClick,
  onCanvasDrag,
  toolbar,
  emptyState,
}: FeaturesCanvasProps) {
  const nodeTypes = useMemo(
    () => ({
      featureNode: FeatureNode,
      repositoryNode: RepositoryNode,
    }),
    []
  );

  const edgeTypes = useMemo(
    () => ({
      dependencyEdge: DependencyEdge,
    }),
    []
  );

  // Callbacks and showHandles are already injected into node.data by deriveGraph.
  // Only selectedFeatureId highlighting needs to be applied here.
  const enrichedNodes = useMemo(
    () =>
      selectedFeatureId == null
        ? nodes
        : (nodes.map((node) =>
            node.type === 'featureNode' &&
            (node.data as FeatureNodeData).featureId === selectedFeatureId
              ? { ...node, selected: true }
              : node
          ) as CanvasNodeType[]),
    [nodes, selectedFeatureId]
  );

  if (nodes.length === 0) {
    if (emptyState) {
      return (
        <div data-testid="features-canvas-empty" className="h-full w-full">
          {emptyState}
        </div>
      );
    }
    return (
      <div data-testid="features-canvas-empty">
        <EmptyState
          title="No features yet"
          description="Get started by creating your first feature."
          action={
            <Button onClick={onAddFeature}>
              <Plus className="mr-2 h-4 w-4" />
              New Feature
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div
      data-testid="features-canvas"
      data-no-drawer-close
      className="pointer-events-auto h-full w-full"
    >
      <ReactFlow
        nodes={enrichedNodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onConnect={onConnect}
        onNodesChange={onNodesChange}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        onMoveStart={onCanvasDrag}
        defaultViewport={{ x: 30, y: 30, zoom: 0.85 }}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        proOptions={{ hideAttribution: true }}
      >
        <Background />
        <Controls />
        {toolbar}
      </ReactFlow>
    </div>
  );
}
