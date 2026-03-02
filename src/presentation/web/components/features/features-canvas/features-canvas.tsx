'use client';

import { useCallback, useMemo } from 'react';
import { ReactFlow, Background, Controls, ReactFlowProvider } from '@xyflow/react';
import type { Connection, Edge, NodeChange } from '@xyflow/react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/common/empty-state';
import { FeatureNode } from '@/components/common/feature-node';
import type { FeatureNodeType, FeatureNodeData } from '@/components/common/feature-node';
import { getDescendantIds } from '@/lib/get-descendant-ids';
import { RepositoryNode } from '@/components/common/repository-node';
import type { RepositoryNodeType } from '@/components/common/repository-node';
import { AddRepositoryNode } from '@/components/common/add-repository-node';
import type { AddRepositoryNodeType } from '@/components/common/add-repository-node';
import { DependencyEdge } from './dependency-edge';

export type CanvasNodeType = FeatureNodeType | RepositoryNodeType | AddRepositoryNodeType;

export interface FeaturesCanvasProps {
  nodes: CanvasNodeType[];
  edges: Edge[];
  onNodesChange?: (changes: NodeChange<CanvasNodeType>[]) => void;
  onAddFeature?: () => void;
  onNodeAction?: (nodeId: string) => void;
  onNodeSettings?: (nodeId: string) => void;
  onNodeClick?: (event: React.MouseEvent, node: CanvasNodeType) => void;
  onPaneClick?: (event: React.MouseEvent) => void;
  onRepositoryAdd?: (repoNodeId: string) => void;
  onRepositoryClick?: (nodeId: string) => void;
  onRepositoryDelete?: (repositoryId: string) => void;
  onFeatureDelete?: (featureId: string) => void;
  onConnect?: (connection: Connection) => void;
  onRepositorySelect?: (path: string) => void;
  onCanvasDrag?: () => void;
  toolbar?: React.ReactNode;
  emptyState?: React.ReactNode;
  /** Set of node IDs whose children are currently collapsed */
  collapsedNodeIds?: Set<string>;
  /** Set of node IDs hidden because an ancestor is collapsed */
  hiddenNodeIds?: Set<string>;
  /** Toggle collapse state for a node */
  toggleCollapse?: (nodeId: string) => void;
}

export function FeaturesCanvas({
  nodes,
  edges,
  onNodesChange,
  onAddFeature,
  onNodeAction,
  onNodeSettings,
  onConnect,
  onNodeClick,
  onPaneClick,
  onRepositoryAdd,
  onRepositoryClick,
  onRepositoryDelete,
  onFeatureDelete,
  onRepositorySelect,
  onCanvasDrag,
  toolbar,
  emptyState,
  collapsedNodeIds,
  hiddenNodeIds,
  toggleCollapse,
}: FeaturesCanvasProps) {
  const nodeTypes = useMemo(
    () => ({
      featureNode: FeatureNode,
      repositoryNode: RepositoryNode,
      addRepositoryNode: AddRepositoryNode,
    }),
    []
  );

  const edgeTypes = useMemo(
    () => ({
      dependencyEdge: DependencyEdge,
    }),
    []
  );

  // Prevent a feature from having more than one source repository
  const isValidConnection = useCallback(
    (connection: Edge | Connection) => {
      const sourceNode = nodes.find((n) => n.id === connection.source);
      if (sourceNode?.type !== 'repositoryNode') return true;

      const targetAlreadyHasRepo = edges.some((e) => {
        const edgeSourceNode = nodes.find((n) => n.id === e.source);
        return edgeSourceNode?.type === 'repositoryNode' && e.target === connection.target;
      });

      return !targetAlreadyHasRepo;
    },
    [nodes, edges]
  );

  // Pre-compute direct child count per node from dep-* edges
  const directChildCountMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const edge of edges) {
      if (!edge.id.startsWith('dep-')) continue;
      map.set(edge.source, (map.get(edge.source) ?? 0) + 1);
    }
    return map;
  }, [edges]);

  // Filter out hidden nodes (descendants of collapsed parents)
  const visibleNodes = useMemo(() => {
    if (!hiddenNodeIds || hiddenNodeIds.size === 0) return nodes;
    return nodes.filter((n) => !hiddenNodeIds.has(n.id));
  }, [nodes, hiddenNodeIds]);

  // Filter out edges where source or target is hidden
  const visibleEdges = useMemo(() => {
    if (!hiddenNodeIds || hiddenNodeIds.size === 0) return edges;
    return edges.filter((e) => !hiddenNodeIds.has(e.source) && !hiddenNodeIds.has(e.target));
  }, [edges, hiddenNodeIds]);

  const enrichedNodes = useMemo(
    () =>
      visibleNodes.map((node) => {
        const directChildren = directChildCountMap.get(node.id) ?? 0;
        const isCollapsed = collapsedNodeIds?.has(node.id) ?? false;

        // When collapsed, show total descendant count (for the badge);
        // when expanded, show direct child count (for toggle visibility)
        const childCount = isCollapsed ? getDescendantIds(node.id, edges).size : directChildren;

        return {
          ...node,
          data: {
            ...node.data,
            showHandles: edges.length > 0,
            ...(node.type === 'featureNode' && (node.data as FeatureNodeData).state !== 'creating'
              ? {
                  onAction: onNodeAction ? () => onNodeAction(node.id) : undefined,
                  onSettings: onNodeSettings ? () => onNodeSettings(node.id) : undefined,
                  onDelete: onFeatureDelete,
                }
              : {}),
            ...(node.type === 'featureNode' && {
              childCount,
              isCollapsed,
              onToggleCollapse:
                directChildren > 0 && toggleCollapse ? () => toggleCollapse(node.id) : undefined,
            }),
            ...(node.type === 'repositoryNode' && {
              onAdd: onRepositoryAdd ? () => onRepositoryAdd(node.id) : undefined,
              onClick: onRepositoryClick ? () => onRepositoryClick(node.id) : undefined,
              onDelete: onRepositoryDelete,
            }),
            ...(node.type === 'addRepositoryNode' && {
              onSelect: onRepositorySelect ? (path: string) => onRepositorySelect(path) : undefined,
            }),
          },
        };
      }) as CanvasNodeType[],
    [
      visibleNodes,
      edges,
      directChildCountMap,
      collapsedNodeIds,
      toggleCollapse,
      onNodeAction,
      onNodeSettings,
      onFeatureDelete,
      onRepositoryAdd,
      onRepositoryClick,
      onRepositoryDelete,
      onRepositorySelect,
    ]
  );

  if (nodes.length === 0) {
    if (emptyState) {
      return (
        <div data-testid="features-canvas-empty" className="h-full w-full">
          {emptyState}
        </div>
      );
    }
    return (
      <div data-testid="features-canvas-empty">
        <EmptyState
          title="No features yet"
          description="Get started by creating your first feature."
          action={
            <Button onClick={onAddFeature}>
              <Plus className="mr-2 h-4 w-4" />
              New Feature
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div
      data-testid="features-canvas"
      data-no-drawer-close
      className="pointer-events-auto h-full w-full"
    >
      <ReactFlowProvider>
        <ReactFlow
          nodes={enrichedNodes}
          edges={visibleEdges}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          isValidConnection={isValidConnection}
          onConnect={onConnect}
          onNodesChange={onNodesChange}
          onNodeClick={onNodeClick}
          onPaneClick={onPaneClick}
          onMoveStart={onCanvasDrag}
          defaultViewport={{ x: 30, y: 30, zoom: 0.85 }}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={false}
        >
          <Background />
          <Controls />
          {toolbar}
        </ReactFlow>
      </ReactFlowProvider>
    </div>
  );
}
