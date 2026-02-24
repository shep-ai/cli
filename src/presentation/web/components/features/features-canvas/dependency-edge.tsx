'use client';

import { BaseEdge, getSmoothStepPath } from '@xyflow/react';
import type { EdgeProps } from '@xyflow/react';

/**
 * Custom React Flow edge for parent→child feature dependencies.
 * Uses the same dashed style as repo→feature edges for visual consistency.
 */
export function DependencyEdge(props: EdgeProps) {
  const [edgePath] = getSmoothStepPath({
    sourceX: props.sourceX,
    sourceY: props.sourceY,
    targetX: props.targetX,
    targetY: props.targetY,
    sourcePosition: props.sourcePosition,
    targetPosition: props.targetPosition,
    borderRadius: 8,
  });

  return (
    <BaseEdge
      id={props.id}
      path={edgePath}
      style={{
        strokeDasharray: '5 5',
      }}
    />
  );
}
