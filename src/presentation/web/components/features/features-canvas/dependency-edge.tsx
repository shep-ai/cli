'use client';

import { BaseEdge, getSmoothStepPath } from '@xyflow/react';
import type { EdgeProps } from '@xyflow/react';

/**
 * Custom React Flow edge for parent→child feature dependencies.
 * Renders an amber dashed line to distinguish from repo→feature edges.
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
        stroke: '#f59e0b', // amber-500
        strokeWidth: 2,
        strokeDasharray: '6 4',
      }}
    />
  );
}
