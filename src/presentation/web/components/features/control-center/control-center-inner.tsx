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
import { ViewTabs } from '@/components/features/view-tabs';
import { BoardView } from '@/components/features/board-view';
import { FilterBar } from '@/components/features/filter-bar';
import { DependencyInspector } from '@/components/features/dependency-inspector';
import { useFilterState } from '@/hooks/use-filter-state';
import { useSavedViews } from '@/hooks/use-saved-views';
import type { FeatureWithRun } from '@/app/build-graph-nodes';
import { buildBoardData, BOARD_COLUMNS } from '@/lib/build-board-data';
import { ControlCenterEmptyState } from './control-center-empty-state';
import { useControlCenterState } from './use-control-center-state';

interface ControlCenterInnerProps {
  initialNodes: CanvasNodeType[];
  initialEdges: Edge[];
  featuresWithRuns?: FeatureWithRun[];
}

export function ControlCenterInner({
  initialNodes,
  initialEdges,
  featuresWithRuns,
}: ControlCenterInnerProps) {
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

  // Filter state — URL-synced filter dimensions
  const { filters, toggleFilter, clearAllFilters, hasActiveFilters } = useFilterState();

  // Derive feature data list for board view and inspector.
  // When featuresWithRuns is available, derive from raw data via buildBoardData.
  // Otherwise fall back to extracting from React Flow nodes (backward compat for tests).
  const featureDataList = useMemo(() => {
    if (featuresWithRuns && featuresWithRuns.length > 0) {
      const boardData = buildBoardData(featuresWithRuns);
      const allFeatures: FeatureNodeData[] = [];
      for (const col of BOARD_COLUMNS) {
        allFeatures.push(...(boardData.get(col.id) ?? []));
      }
      return allFeatures;
    }
    return nodes.filter((n) => n.type === 'featureNode').map((n) => n.data as FeatureNodeData);
  }, [featuresWithRuns, nodes]);

  // Build parentIdMap for the inspector panel.
  // When featuresWithRuns is available, derive from feature.parentId directly.
  // Otherwise fall back to parsing dependency edges.
  const parentIdMap = useMemo(() => {
    const map: Record<string, string> = {};
    if (featuresWithRuns && featuresWithRuns.length > 0) {
      for (const { feature } of featuresWithRuns) {
        if (feature.parentId) {
          map[feature.id] = feature.parentId;
        }
      }
      return map;
    }
    for (const edge of edges) {
      if (!edge.id.startsWith('dep-')) continue;
      const sourceFeatureId = edge.source.startsWith('feat-') ? edge.source.slice(5) : edge.source;
      const targetFeatureId = edge.target.startsWith('feat-') ? edge.target.slice(5) : edge.target;
      map[targetFeatureId] = sourceFeatureId;
    }
    return map;
  }, [featuresWithRuns, edges]);

  // Derive available agent types and repositories from current data
  const availableAgentTypes = useMemo(() => {
    const types = new Set<string>();
    for (const f of featureDataList) {
      if (f.agentType) types.add(f.agentType);
    }
    return Array.from(types).sort();
  }, [featureDataList]);

  const availableRepositories = useMemo(() => {
    const repos = new Set<string>();
    for (const f of featureDataList) {
      if (f.repositoryPath) repos.add(f.repositoryPath);
    }
    return Array.from(repos).sort();
  }, [featureDataList]);

  // Board row click handler — adapts BoardView's (data) => void to selectFeatureById
  const handleBoardSelect = useCallback(
    (data: FeatureNodeData) => {
      selectFeatureById(data.featureId);
    },
    [selectFeatureById]
  );

  // Saved views — localStorage persistence
  const savedViewsHook = useSavedViews({
    applyFilters: (savedFilters) => {
      // Apply each dimension from the saved view
      // Clear current filters first, then apply saved ones
      clearAllFilters();
      for (const value of savedFilters.lifecycle) toggleFilter('lifecycle', value);
      for (const value of savedFilters.status) toggleFilter('status', value);
      for (const value of savedFilters.agentType) toggleFilter('agentType', value);
      for (const value of savedFilters.repository) toggleFilter('repository', value);
    },
  });

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

  const mapContent = (
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
      onFeatureDelete={handleDeleteFeature}
      onRepositorySelect={handleAddRepository}
      emptyState={<ControlCenterEmptyState onRepositorySelect={handleAddRepository} />}
    />
  );

  const filterBar = (
    <FilterBar
      filters={filters}
      onToggleFilter={toggleFilter}
      onClearAllFilters={clearAllFilters}
      hasActiveFilters={hasActiveFilters}
      availableAgentTypes={availableAgentTypes}
      availableRepositories={availableRepositories}
      savedViews={savedViewsHook.views}
      onApplyView={savedViewsHook.applyView}
      onSaveView={savedViewsHook.saveView}
      onDeleteView={savedViewsHook.deleteView}
      onRenameView={savedViewsHook.renameView}
    />
  );

  const boardContent = (
    <BoardView
      features={featureDataList}
      filters={filters}
      selectedFeatureId={selectedNode?.featureId}
      onSelect={handleBoardSelect}
      onDetails={handleBoardSelect}
      onClearSelection={clearSelection}
      filterBar={filterBar}
    />
  );

  return (
    <>
      <NotificationPermissionBanner />
      <div className="flex h-full overflow-hidden">
        <div className="flex-1 overflow-hidden">
          <ViewTabs boardContent={boardContent} mapContent={mapContent} />
        </div>
        <DependencyInspector
          selectedFeature={selectedNode}
          allFeatures={featureDataList}
          parentIdMap={parentIdMap}
          onFeatureSelect={selectFeatureById}
        />
      </div>
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
