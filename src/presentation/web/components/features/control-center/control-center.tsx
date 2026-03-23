'use client';

import type { ReactNode } from 'react';
import { ReactFlowProvider } from '@xyflow/react';
import type { Edge } from '@xyflow/react';
import type { CanvasNodeType } from '@/components/features/features-canvas';
import { SessionsProvider } from '@/hooks/sessions-provider';
import { ControlCenterInner } from './control-center-inner';

export interface ControlCenterProps {
  initialNodes: CanvasNodeType[];
  initialEdges: Edge[];
  /** Drawer content rendered by the @drawer parallel route slot. */
  drawer?: ReactNode;
}

export function ControlCenter({ initialNodes, initialEdges, drawer }: ControlCenterProps) {
  return (
    <div data-testid="control-center" className="h-full w-full">
      <SessionsProvider>
        <ReactFlowProvider>
          <ControlCenterInner initialNodes={initialNodes} initialEdges={initialEdges} />
        </ReactFlowProvider>
      </SessionsProvider>
      <div key="drawer">{drawer}</div>
    </div>
  );
}
