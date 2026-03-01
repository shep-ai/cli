'use client';

import type { Edge } from '@xyflow/react';
import type { CanvasNodeType } from '@/components/features/features-canvas';
import type { FeatureWithRun } from '@/app/build-graph-nodes';
import { ControlCenterInner } from './control-center-inner';

export interface ControlCenterProps {
  initialNodes: CanvasNodeType[];
  initialEdges: Edge[];
  featuresWithRuns?: FeatureWithRun[];
}

export function ControlCenter({
  initialNodes,
  initialEdges,
  featuresWithRuns,
}: ControlCenterProps) {
  return (
    <div data-testid="control-center" className="h-full w-full">
      <ControlCenterInner
        initialNodes={initialNodes}
        initialEdges={initialEdges}
        featuresWithRuns={featuresWithRuns}
      />
    </div>
  );
}
