'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Controls,
  ControlButton,
  useReactFlow,
} from '@xyflow/react';
import type { Connection, Edge, NodeChange, OnMoveEnd, Viewport } from '@xyflow/react';
import { Plus, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/common/empty-state';
import { FeatureNode } from '@/components/common/feature-node';
import type { FeatureNodeType, FeatureNodeData } from '@/components/common/feature-node';
import { RepositoryNode } from '@/components/common/repository-node';
import type { RepositoryNodeType } from '@/components/common/repository-node';
import { DependencyEdge } from './dependency-edge';

export type CanvasNodeType = FeatureNodeType | RepositoryNodeType;

export interface FeaturesCanvasProps {
  nodes: CanvasNodeType[];
  edges: Edge[];
  selectedFeatureId?: string | null;
  defaultViewport?: Viewport;
  onNodesChange?: (changes: NodeChange<CanvasNodeType>[]) => void;
  onAddFeature?: () => void;
  onNodeClick?: (event: React.MouseEvent, node: CanvasNodeType) => void;
  onPaneClick?: (event: React.MouseEvent) => void;
  onConnect?: (connection: Connection) => void;
  onCanvasDrag?: () => void;
  onMoveEnd?: OnMoveEnd;
  onResetViewport?: () => Viewport;
  toolbar?: React.ReactNode;
  emptyState?: React.ReactNode;
}

const FALLBACK_VIEWPORT: Viewport = { x: 30, y: 30, zoom: 0.85 };

function ResetButton({ onResetViewport }: { onResetViewport: () => Viewport }) {
  const { setViewport } = useReactFlow();

  const handleReset = useCallback(() => {
    const viewport = onResetViewport();
    setViewport(viewport, { duration: 400 });
  }, [onResetViewport, setViewport]);

  return (
    <ControlButton onClick={handleReset} title="Reset view" aria-label="Reset view">
      <RotateCcw style={{ fill: 'none' }} />
    </ControlButton>
  );
}

export function FeaturesCanvas({
  nodes,
  edges,
  selectedFeatureId,
  defaultViewport,
  onNodesChange,
  onAddFeature,
  onConnect,
  onNodeClick,
  onPaneClick,
  onCanvasDrag,
  onMoveEnd,
  onResetViewport,
  toolbar,
  emptyState,
}: FeaturesCanvasProps) {
  const nodeTypes = useMemo(
    () => ({
      featureNode: FeatureNode,
      repositoryNode: RepositoryNode,
    }),
    []
  );

  const edgeTypes = useMemo(
    () => ({
      dependencyEdge: DependencyEdge,
    }),
    []
  );

  // Callbacks and showHandles are already injected into node.data by deriveGraph.
  // Only selectedFeatureId highlighting needs to be applied here.
  const enrichedNodes = useMemo(
    () =>
      selectedFeatureId == null
        ? nodes
        : (nodes.map((node) =>
            node.type === 'featureNode' &&
            (node.data as FeatureNodeData).featureId === selectedFeatureId
              ? { ...node, selected: true }
              : node
          ) as CanvasNodeType[]),
    [nodes, selectedFeatureId]
  );

  const isEmpty = nodes.length === 0;

  // Track empty→populated transition for exit animation.
  // When isEmpty flips from true to false, keep the overlay mounted
  // and fade it out before removing it from the DOM.
  const [showOverlay, setShowOverlay] = useState(isEmpty);
  const [overlayExiting, setOverlayExiting] = useState(false);
  const prevEmptyRef = useRef(isEmpty);

  useEffect(() => {
    if (prevEmptyRef.current && !isEmpty) {
      // Was empty, now populated — start exit animation
      setOverlayExiting(true);
      const timer = setTimeout(() => {
        setShowOverlay(false);
        setOverlayExiting(false);
      }, 300);
      return () => clearTimeout(timer);
    }
    if (!prevEmptyRef.current && isEmpty) {
      // Was populated, now empty — show overlay immediately
      setShowOverlay(true);
    }
    prevEmptyRef.current = isEmpty;
  }, [isEmpty]);

  const fallbackEmptyState =
    isEmpty && !emptyState ? (
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
    ) : null;

  const overlayContent = emptyState ?? fallbackEmptyState;

  return (
    <div
      data-testid={isEmpty ? 'features-canvas-empty' : 'features-canvas'}
      data-no-drawer-close
      className="dark:bg-background pointer-events-auto relative h-full w-full bg-[#f6f7f8]"
    >
      <ReactFlow
        nodes={enrichedNodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onConnect={onConnect}
        onNodesChange={onNodesChange}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        onMoveStart={onCanvasDrag}
        onMoveEnd={onMoveEnd}
        defaultViewport={defaultViewport ?? FALLBACK_VIEWPORT}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        proOptions={{ hideAttribution: true }}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={24}
          size={1}
          color="#b8bcc4"
          className="dark:[&_circle]:!fill-white/[0.1]"
        />
        {!isEmpty && (
          <Controls showInteractive={false}>
            {onResetViewport ? <ResetButton onResetViewport={onResetViewport} /> : null}
          </Controls>
        )}
        {toolbar}
      </ReactFlow>
      {showOverlay && overlayContent ? (
        <div
          className={cn(
            'pointer-events-none absolute inset-0 z-10 flex items-center justify-center transition-opacity duration-300',
            overlayExiting ? 'opacity-0' : 'animate-in fade-in opacity-100 duration-200'
          )}
        >
          <div className="pointer-events-auto">{overlayContent}</div>
        </div>
      ) : null}
    </div>
  );
}
