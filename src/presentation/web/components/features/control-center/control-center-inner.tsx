'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Edge } from '@xyflow/react';
import { FeaturesCanvas } from '@/components/features/features-canvas';
import type { CanvasNodeType } from '@/components/features/features-canvas';
import type { FeatureNodeData } from '@/components/common/feature-node';
import { ControlCenterDrawer, computeDrawerView } from '@/components/common/control-center-drawer';
import type { RepositoryNodeData } from '@/components/common/repository-node';
import { NotificationPermissionBanner } from '@/components/common/notification-permission-banner';
import { getWorkflowDefaults } from '@/app/actions/get-workflow-defaults';
import type { WorkflowDefaults } from '@/app/actions/get-workflow-defaults';
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
    isDeleting,
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
    handleDeleteFeature,
    handleDeleteRepository,
    closeCreateDrawer,
    selectFeatureById,
    pendingParentFeatureId,
  } = useControlCenterState(initialNodes, initialEdges);

  // Feature list for the parent selector in the create drawer
  const featureOptions = useMemo(
    () =>
      nodes
        .filter((n) => n.type === 'featureNode')
        .map((n) => {
          const data = n.data as FeatureNodeData;
          return { id: data.featureId, name: data.name };
        })
        .filter((f) => f.id && !f.id.startsWith('#')),
    [nodes]
  );

  // Workflow defaults for the create-feature drawer
  const [workflowDefaults, setWorkflowDefaults] = useState<WorkflowDefaults | undefined>();
  useEffect(() => {
    getWorkflowDefaults()
      .then(setWorkflowDefaults)
      .catch(() => {
        // Settings unavailable — create drawer falls back to all-false defaults
      });
  }, []);

  // Repository drawer state (independent of feature selection)
  const [selectedRepoNode, setSelectedRepoNode] = useState<RepositoryNodeData | null>(null);

  // Close all drawers — used on pane click and canvas drag
  const handleClearDrawers = useCallback(() => {
    clearSelection();
    setSelectedRepoNode(null);
    closeCreateDrawer();
  }, [clearSelection, closeCreateDrawer]);

  // Open repository drawer when a repo node is clicked
  const handleRepositoryClick = useCallback(
    (nodeId: string) => {
      const node = nodes.find((n) => n.id === nodeId);
      if (node?.type === 'repositoryNode') {
        clearSelection();
        setSelectedRepoNode(node.data as RepositoryNodeData);
      }
    },
    [nodes, clearSelection]
  );

  // Derive the single active drawer view from all current state
  const drawerView = computeDrawerView({
    selectedNode,
    isCreateDrawerOpen,
    pendingRepositoryPath,
    pendingParentFeatureId,
    selectedRepoNode,
    features: featureOptions,
    workflowDefaults,
  });

  // Listen for global "open create drawer" events from the sidebar
  useEffect(() => {
    const handler = () => handleAddFeature();
    window.addEventListener('shep:open-create-drawer', handler);
    return () => window.removeEventListener('shep:open-create-drawer', handler);
  }, [handleAddFeature]);

  // Listen for global "add repository" events from the top bar button
  useEffect(() => {
    const handler = (e: Event) => {
      const path = (e as CustomEvent<{ path: string }>).detail.path;
      handleAddRepository(path);
    };
    window.addEventListener('shep:add-repository', handler);
    return () => window.removeEventListener('shep:add-repository', handler);
  }, [handleAddRepository]);

  // Listen for notification "Review" clicks to open the relevant drawer
  useEffect(() => {
    const handler = (e: Event) => {
      const featureId = (e as CustomEvent<{ featureId: string }>).detail.featureId;
      selectFeatureById(featureId);
    };
    window.addEventListener('shep:select-feature', handler);
    return () => window.removeEventListener('shep:select-feature', handler);
  }, [selectFeatureById]);

  const hasRepositories = nodes.some((n) => n.type === 'repositoryNode');

  if (!hasRepositories) {
    return (
      <>
        <NotificationPermissionBanner />
        <ControlCenterEmptyState onRepositorySelect={handleAddRepository} />
        <ControlCenterDrawer
          view={drawerView}
          onClose={handleClearDrawers}
          onDelete={handleDeleteFeature}
          isDeleting={isDeleting}
          onCreateSubmit={handleCreateFeatureSubmit}
        />
      </>
    );
  }

  return (
    <>
      <NotificationPermissionBanner />
      <FeaturesCanvas
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onConnect={handleConnect}
        onAddFeature={handleAddFeature}
        onNodeAction={handleAddFeatureToFeature}
        onNodeClick={handleNodeClick}
        onPaneClick={handleClearDrawers}
        onRepositoryAdd={handleAddFeatureToRepo}
        onRepositoryClick={handleRepositoryClick}
        onRepositoryDelete={handleDeleteRepository}
        onRepositorySelect={handleAddRepository}
        emptyState={<ControlCenterEmptyState onRepositorySelect={handleAddRepository} />}
      />
      <ControlCenterDrawer
        view={drawerView}
        onClose={handleClearDrawers}
        onDelete={handleDeleteFeature}
        isDeleting={isDeleting}
        onCreateSubmit={handleCreateFeatureSubmit}
      />
    </>
  );
}
