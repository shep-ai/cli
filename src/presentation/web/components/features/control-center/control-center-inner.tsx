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
  const { handleAddFeature, handleAddFeatureToRepo, handleAddFeatureToFeature, clearSelection } =
    useControlCenterState();

  return (
    <FeaturesCanvas
      nodes={initialNodes}
      edges={initialEdges}
      onAddFeature={handleAddFeature}
      onNodeAction={handleAddFeatureToFeature}
      onPaneClick={clearSelection}
      onRepositoryAdd={handleAddFeatureToRepo}
      toolbar={<ControlCenterToolbar onAddFeature={handleAddFeature} />}
    />
  );
}
