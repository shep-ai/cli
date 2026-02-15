'use client';

import { ReactFlowProvider } from '@xyflow/react';
import type { Edge } from '@xyflow/react';
import type { CanvasNodeType } from '@/components/features/features-canvas';
import { ControlCenterInner } from './control-center-inner';

export interface ControlCenterProps {
  initialNodes: CanvasNodeType[];
  initialEdges: Edge[];
}

export function ControlCenter({ initialNodes, initialEdges }: ControlCenterProps) {
  return (
    <div data-testid="control-center" className="h-full w-full">
      <ReactFlowProvider>
        <ControlCenterInner initialNodes={initialNodes} initialEdges={initialEdges} />
      </ReactFlowProvider>
    </div>
  );
}
