'use client';

import type { Edge } from '@xyflow/react';
import { FeaturesCanvas } from '@/components/features/features-canvas';
import type { CanvasNodeType } from '@/components/features/features-canvas';
import { ControlCenterToolbar } from './control-center-toolbar';
import { useControlCenterState } from './use-control-center-state';

interface ControlCenterInnerProps {
  initialNodes: CanvasNodeType[];
  initialEdges: Edge[];
}

export function ControlCenterInner({ initialNodes, initialEdges }: ControlCenterInnerProps) {
  const {
    nodes,
    edges,
    onNodesChange,
    handleConnect,
    handleAddFeature,
    handleAddFeatureToRepo,
    handleAddFeatureToFeature,
    handleAddRepository,
    handleNodeClick,
    clearSelection,
    handleLayout,
  } = useControlCenterState(initialNodes, initialEdges);

  return (
    <FeaturesCanvas
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onConnect={handleConnect}
      onAddFeature={handleAddFeature}
      onNodeAction={handleAddFeatureToFeature}
      onNodeClick={handleNodeClick}
      onPaneClick={clearSelection}
      onRepositoryAdd={handleAddFeatureToRepo}
      onRepositorySelect={handleAddRepository}
      toolbar={<ControlCenterToolbar onAddFeature={handleAddFeature} onLayout={handleLayout} />}
    />
  );
}
