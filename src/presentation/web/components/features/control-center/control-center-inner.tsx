'use client';

import { useEffect } from 'react';
import type { Edge } from '@xyflow/react';
import { FeaturesCanvas } from '@/components/features/features-canvas';
import type { CanvasNodeType } from '@/components/features/features-canvas';
import { FeatureDrawer, FeatureCreateDrawer } from '@/components/common';
import { ControlCenterEmptyState } from './control-center-empty-state';
import { useControlCenterState } from './use-control-center-state';

interface ControlCenterInnerProps {
  initialNodes: CanvasNodeType[];
  initialEdges: Edge[];
}

export function ControlCenterInner({ initialNodes, initialEdges }: ControlCenterInnerProps) {
  const {
    nodes,
    edges,
    selectedNode,
    isCreateDrawerOpen,
    isSubmitting,
    pendingRepositoryPath,
    onNodesChange,
    handleConnect,
    handleAddFeature,
    handleAddFeatureToRepo,
    handleAddFeatureToFeature,
    handleAddRepository,
    handleNodeClick,
    clearSelection,
    handleCreateFeatureSubmit,
    closeCreateDrawer,
  } = useControlCenterState(initialNodes, initialEdges);

  // Listen for global "open create drawer" events from the sidebar
  useEffect(() => {
    const handler = () => handleAddFeature();
    window.addEventListener('shep:open-create-drawer', handler);
    return () => window.removeEventListener('shep:open-create-drawer', handler);
  }, [handleAddFeature]);

  return (
    <>
      <FeaturesCanvas
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onConnect={handleConnect}
        onAddFeature={handleAddFeature}
        onNodeAction={handleAddFeatureToFeature}
        onNodeClick={handleNodeClick}
        onPaneClick={clearSelection}
        onRepositoryAdd={handleAddFeatureToRepo}
        onRepositorySelect={handleAddRepository}
        emptyState={<ControlCenterEmptyState onRepositorySelect={handleAddRepository} />}
      />
      <FeatureDrawer selectedNode={selectedNode} onClose={clearSelection} />
      <FeatureCreateDrawer
        open={isCreateDrawerOpen}
        onClose={closeCreateDrawer}
        onSubmit={handleCreateFeatureSubmit}
        repositoryPath={pendingRepositoryPath}
        isSubmitting={isSubmitting}
      />
    </>
  );
}
