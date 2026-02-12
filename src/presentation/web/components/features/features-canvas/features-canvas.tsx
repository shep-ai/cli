'use client';

import { useMemo } from 'react';
import { ReactFlow, Background, Controls, ReactFlowProvider } from '@xyflow/react';
import type { Edge } from '@xyflow/react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/common/empty-state';
import { FeatureNode } from '@/components/common/feature-node';
import type { FeatureNodeType } from '@/components/common/feature-node';
import { RepositoryNode } from '@/components/common/repository-node';
import type { RepositoryNodeType } from '@/components/common/repository-node';
import { AddRepositoryNode } from '@/components/common/add-repository-node';
import type { AddRepositoryNodeType } from '@/components/common/add-repository-node';

export type CanvasNodeType = FeatureNodeType | RepositoryNodeType | AddRepositoryNodeType;

export interface FeaturesCanvasProps {
  nodes: CanvasNodeType[];
  edges: Edge[];
  onAddFeature?: () => void;
  onNodeAction?: (nodeId: string) => void;
  onNodeSettings?: (nodeId: string) => void;
  onNodeClick?: (event: React.MouseEvent, node: CanvasNodeType) => void;
  onPaneClick?: (event: React.MouseEvent) => void;
  onRepositoryAdd?: (repoNodeId: string) => void;
  toolbar?: React.ReactNode;
}

export function FeaturesCanvas({
  nodes,
  edges,
  onAddFeature,
  onNodeAction,
  onNodeSettings,
  onNodeClick,
  onPaneClick,
  onRepositoryAdd,
  toolbar,
}: FeaturesCanvasProps) {
  const nodeTypes = useMemo(
    () => ({
      featureNode: FeatureNode,
      repositoryNode: RepositoryNode,
      addRepositoryNode: AddRepositoryNode,
    }),
    []
  );

  const enrichedNodes = useMemo(
    () =>
      nodes.map((node) => ({
        ...node,
        data: {
          ...node.data,
          showHandles: edges.length > 0,
          ...(node.type === 'featureNode' && {
            onAction: onNodeAction ? () => onNodeAction(node.id) : undefined,
            onSettings: onNodeSettings ? () => onNodeSettings(node.id) : undefined,
          }),
          ...(node.type === 'repositoryNode' && {
            onAdd: onRepositoryAdd ? () => onRepositoryAdd(node.id) : undefined,
          }),
        },
      })) as CanvasNodeType[],
    [nodes, edges.length, onNodeAction, onNodeSettings, onRepositoryAdd]
  );

  if (nodes.length === 0) {
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
          onNodeClick={onNodeClick}
          onPaneClick={onPaneClick}
          fitView
        >
          <Background />
          <Controls />
          {toolbar}
        </ReactFlow>
      </ReactFlowProvider>
    </div>
  );
}
