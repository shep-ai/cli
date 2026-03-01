'use client';

import { useCallback, useMemo } from 'react';
import { ReactFlow, ReactFlowProvider, Background } from '@xyflow/react';
import type { Node, Edge } from '@xyflow/react';
import { cn } from '@/lib/utils';
import { featureNodeStateConfig } from '@/components/common/feature-node';
import type { FeatureNodeData } from '@/components/common/feature-node';
import { layoutWithDagre } from '@/lib/layout-with-dagre';

export interface DependencyMiniGraphProps {
  selectedFeature: FeatureNodeData;
  allFeatures: FeatureNodeData[];
  /** Map of featureId → parentId for dependency traversal */
  parentIdMap: Record<string, string>;
  onFeatureSelect?: (featureId: string) => void;
}

/** Compact mini-node dimensions for the dependency graph */
const MINI_NODE_WIDTH = 160;
const MINI_NODE_HEIGHT = 40;

interface MiniNodeData {
  name: string;
  state: FeatureNodeData['state'];
  isSelected: boolean;
  [key: string]: unknown;
}

type MiniNodeType = Node<MiniNodeData, 'default'>;

/**
 * Build a 1-hop subgraph centered on the selected feature:
 * upstream parent (if any) + selected feature + downstream children.
 */
function buildSubgraph(
  selectedFeature: FeatureNodeData,
  allFeatures: FeatureNodeData[],
  parentIdMap: Record<string, string>
): { nodes: MiniNodeType[]; edges: Edge[] } {
  const nodes: MiniNodeType[] = [];
  const edges: Edge[] = [];
  const addedIds = new Set<string>();

  const addNode = (feature: FeatureNodeData, isSelected: boolean) => {
    if (addedIds.has(feature.featureId)) return;
    addedIds.add(feature.featureId);
    nodes.push({
      id: feature.featureId,
      type: 'default',
      position: { x: 0, y: 0 },
      data: {
        name: feature.name,
        state: feature.state,
        isSelected,
        width: MINI_NODE_WIDTH,
        height: MINI_NODE_HEIGHT,
      },
    });
  };

  // Add selected feature
  addNode(selectedFeature, true);

  // Add upstream parent (1-hop)
  const parentId = parentIdMap[selectedFeature.featureId];
  if (parentId) {
    const parent = allFeatures.find((f) => f.featureId === parentId);
    if (parent) {
      addNode(parent, false);
      edges.push({
        id: `dep-${parentId}-${selectedFeature.featureId}`,
        source: parentId,
        target: selectedFeature.featureId,
        type: 'default',
        style: { strokeDasharray: '5 5' },
      });
    }
  }

  // Add downstream children (1-hop)
  for (const [childId, pId] of Object.entries(parentIdMap)) {
    if (pId === selectedFeature.featureId) {
      const child = allFeatures.find((f) => f.featureId === childId);
      if (child) {
        addNode(child, false);
        edges.push({
          id: `dep-${selectedFeature.featureId}-${childId}`,
          source: selectedFeature.featureId,
          target: childId,
          type: 'default',
          style: { strokeDasharray: '5 5' },
        });
      }
    }
  }

  return { nodes, edges };
}

/** Custom render function for mini-graph nodes */
function MiniGraphNode({ data }: { data: MiniNodeData }) {
  const config = featureNodeStateConfig[data.state];
  const Icon = config.icon;
  const isSpinning = data.state === 'creating' || data.state === 'running';

  return (
    <div
      className={cn(
        'bg-background flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs shadow-sm',
        data.isSelected && 'ring-primary border-primary/50 ring-2',
        !data.isSelected && 'border-border'
      )}
      style={{ width: MINI_NODE_WIDTH, height: MINI_NODE_HEIGHT }}
    >
      <Icon className={cn('h-3 w-3 shrink-0', config.badgeClass, isSpinning && 'animate-spin')} />
      <span className="truncate">{data.name}</span>
    </div>
  );
}

const nodeTypes = { default: MiniGraphNode };

export function DependencyMiniGraph({
  selectedFeature,
  allFeatures,
  parentIdMap,
  onFeatureSelect,
}: DependencyMiniGraphProps) {
  const subgraph = useMemo(
    () => buildSubgraph(selectedFeature, allFeatures, parentIdMap),
    [selectedFeature, allFeatures, parentIdMap]
  );

  const laid = useMemo(
    () =>
      layoutWithDagre(subgraph.nodes, subgraph.edges, {
        direction: 'TB',
        nodeSize: { width: MINI_NODE_WIDTH, height: MINI_NODE_HEIGHT },
        ranksep: 40,
        nodesep: 20,
      }),
    [subgraph]
  );

  const handleNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      onFeatureSelect?.(node.id);
    },
    [onFeatureSelect]
  );

  return (
    <ReactFlowProvider>
      <div className="h-48 w-full rounded-md border" data-testid="dependency-mini-graph">
        <ReactFlow
          nodes={laid.nodes}
          edges={laid.edges}
          nodeTypes={nodeTypes}
          onNodeClick={handleNodeClick}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={true}
          panOnDrag={false}
          zoomOnScroll={false}
          zoomOnPinch={false}
          zoomOnDoubleClick={false}
          fitView
          fitViewOptions={{ padding: 0.3 }}
          proOptions={{ hideAttribution: true }}
        >
          <Background />
        </ReactFlow>
      </div>
    </ReactFlowProvider>
  );
}
