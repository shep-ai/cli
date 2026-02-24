'use client';

import { BaseEdge, getBezierPath } from '@xyflow/react';
import type { EdgeProps } from '@xyflow/react';

/**
 * Custom React Flow edge for parent→child feature dependencies.
 * Uses bezier curves and dashed style matching repo→feature edges.
 */
export function DependencyEdge(props: EdgeProps) {
  const [edgePath] = getBezierPath({
    sourceX: props.sourceX,
    sourceY: props.sourceY,
    targetX: props.targetX,
    targetY: props.targetY,
    sourcePosition: props.sourcePosition,
    targetPosition: props.targetPosition,
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
