import type { Edge } from '@xyflow/react';
import type { CanvasNodeType } from '@/components/features/features-canvas';

export async function fetchGraphData(): Promise<{ nodes: CanvasNodeType[]; edges: Edge[] }> {
  return { nodes: [], edges: [] };
}
