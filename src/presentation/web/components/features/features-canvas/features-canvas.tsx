'use client';

import { useCallback, useMemo } from 'react';
import { ReactFlow, Background, Controls, Panel, ReactFlowProvider } from '@xyflow/react';
import type { Connection, Edge, NodeChange } from '@xyflow/react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/common/empty-state';
import { FeatureNode } from '@/components/common/feature-node';
import type { FeatureNodeType, FeatureNodeData } from '@/components/common/feature-node';
import { RepositoryNode } from '@/components/common/repository-node';
import type { RepositoryNodeType } from '@/components/common/repository-node';
import { AddRepositoryButton, AddRepositoryNode } from '@/components/common/add-repository-node';
import type { AddRepositoryNodeType } from '@/components/common/add-repository-node';
import { DependencyEdge } from './dependency-edge';

export type CanvasNodeType = FeatureNodeType | RepositoryNodeType | AddRepositoryNodeType;

export interface FeaturesCanvasProps {
  nodes: CanvasNodeType[];
  edges: Edge[];
  onNodesChange?: (changes: NodeChange<CanvasNodeType>[]) => void;
  onAddFeature?: () => void;
  onNodeAction?: (nodeId: string) => void;
  onNodeSettings?: (nodeId: string) => void;
  onNodeClick?: (event: React.MouseEvent, node: CanvasNodeType) => void;
  onPaneClick?: (event: React.MouseEvent) => void;
  onRepositoryAdd?: (repoNodeId: string) => void;
  onRepositoryDelete?: (repositoryId: string) => void;
  onConnect?: (connection: Connection) => void;
  onRepositorySelect?: (path: string) => void;
  toolbar?: React.ReactNode;
  emptyState?: React.ReactNode;
}

export function FeaturesCanvas({
  nodes,
  edges,
  onNodesChange,
  onAddFeature,
  onNodeAction,
  onNodeSettings,
  onConnect,
  onNodeClick,
  onPaneClick,
  onRepositoryAdd,
  onRepositoryDelete,
  onRepositorySelect,
  toolbar,
  emptyState,
}: FeaturesCanvasProps) {
  const nodeTypes = useMemo(
    () => ({
      featureNode: FeatureNode,
      repositoryNode: RepositoryNode,
      addRepositoryNode: AddRepositoryNode,
    }),
    []
  );

  const edgeTypes = useMemo(
    () => ({
      dependencyEdge: DependencyEdge,
    }),
    []
  );

  // Prevent a feature from having more than one source repository
  const isValidConnection = useCallback(
    (connection: Edge | Connection) => {
      const sourceNode = nodes.find((n) => n.id === connection.source);
      if (sourceNode?.type !== 'repositoryNode') return true;

      const targetAlreadyHasRepo = edges.some((e) => {
        const edgeSourceNode = nodes.find((n) => n.id === e.source);
        return edgeSourceNode?.type === 'repositoryNode' && e.target === connection.target;
      });

      return !targetAlreadyHasRepo;
    },
    [nodes, edges]
  );

  const enrichedNodes = useMemo(
    () =>
      nodes.map((node) => ({
        ...node,
        data: {
          ...node.data,
          showHandles: edges.length > 0,
          ...(node.type === 'featureNode' && (node.data as FeatureNodeData).state !== 'creating'
            ? {
                onAction: onNodeAction ? () => onNodeAction(node.id) : undefined,
                onSettings: onNodeSettings ? () => onNodeSettings(node.id) : undefined,
              }
            : {}),
          ...(node.type === 'repositoryNode' && {
            onAdd: onRepositoryAdd ? () => onRepositoryAdd(node.id) : undefined,
            onDelete: onRepositoryDelete,
          }),
          ...(node.type === 'addRepositoryNode' && {
            onSelect: onRepositorySelect ? (path: string) => onRepositorySelect(path) : undefined,
          }),
        },
      })) as CanvasNodeType[],
    [
      nodes,
      edges.length,
      onNodeAction,
      onNodeSettings,
      onRepositoryAdd,
      onRepositoryDelete,
      onRepositorySelect,
    ]
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
    <div data-testid="features-canvas" className="h-full w-full">
      <ReactFlowProvider>
        <ReactFlow
          nodes={enrichedNodes}
          edges={edges}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          isValidConnection={isValidConnection}
          onConnect={onConnect}
          onNodesChange={onNodesChange}
          onNodeClick={onNodeClick}
          onPaneClick={onPaneClick}
          defaultViewport={{ x: 30, y: 30, zoom: 0.85 }}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={false}
        >
          <Background />
          <Controls />
          {onRepositorySelect ? (
            <Panel position="top-right" className="mr-16">
              <AddRepositoryButton onSelect={onRepositorySelect} />
            </Panel>
          ) : null}
          {toolbar}
        </ReactFlow>
      </ReactFlowProvider>
    </div>
  );
}
