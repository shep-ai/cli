'use client';

import { useMemo } from 'react';
import { ReactFlow, Background, Controls, ReactFlowProvider } from '@xyflow/react';
import type { Edge } from '@xyflow/react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/common/empty-state';
import { FeatureNode } from '@/components/common/feature-node';
import type { FeatureNodeType } from '@/components/common/feature-node';

export interface FeatureFlowCanvasProps {
  nodes: FeatureNodeType[];
  edges: Edge[];
  onAddFeature?: () => void;
  onNodeAction?: (nodeId: string) => void;
  onNodeSettings?: (nodeId: string) => void;
}

export function FeatureFlowCanvas({
  nodes,
  edges,
  onAddFeature,
  onNodeAction,
  onNodeSettings,
}: FeatureFlowCanvasProps) {
  const nodeTypes = useMemo(() => ({ featureNode: FeatureNode }), []);

  const enrichedNodes = useMemo(
    () =>
      nodes.map((node) => ({
        ...node,
        data: {
          ...node.data,
          onAction: onNodeAction ? () => onNodeAction(node.id) : undefined,
          onSettings: onNodeSettings ? () => onNodeSettings(node.id) : undefined,
        },
      })),
    [nodes, onNodeAction, onNodeSettings]
  );

  if (nodes.length === 0) {
    return (
      <div data-testid="feature-flow-canvas-empty">
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
    <div data-testid="feature-flow-canvas" className="h-full w-full">
      <ReactFlowProvider>
        <ReactFlow nodes={enrichedNodes} edges={edges} nodeTypes={nodeTypes} fitView>
          <Background />
          <Controls />
        </ReactFlow>
      </ReactFlowProvider>
    </div>
  );
}
