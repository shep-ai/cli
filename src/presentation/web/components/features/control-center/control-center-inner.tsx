'use client';

import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import type { Edge, Viewport } from '@xyflow/react';
import { useReactFlow } from '@xyflow/react';
import { FeaturesCanvas } from '@/components/features/features-canvas';
import type { CanvasNodeType } from '@/components/features/features-canvas';
import type { FeatureNodeData } from '@/components/common/feature-node';
import type { RepositoryNodeData } from '@/components/common/repository-node';
import {
  useSidebarFeaturesContext,
  mapNodeStateToSidebarStatus,
} from '@/hooks/sidebar-features-context';
import { useSelectedFeatureId } from '@/hooks/use-selected-feature-id';
import { useSoundAction } from '@/hooks/use-sound-action';
import { useDrawerCloseGuard } from '@/hooks/drawer-close-guard';
import { useViewportPersistence } from '@/hooks/use-viewport-persistence';
import { ControlCenterEmptyState } from './control-center-empty-state';
import { useControlCenterState } from './use-control-center-state';

const AUTO_FOCUS_OPTIONS = {
  maxZoom: 1.0,
  padding: 0.5,
  duration: 500,
} as const;

const AUTO_FOCUS_DRAWER_DELAY_MS = 600;

interface ControlCenterInnerProps {
  initialNodes: CanvasNodeType[];
  initialEdges: Edge[];
}

export function ControlCenterInner({ initialNodes, initialEdges }: ControlCenterInnerProps) {
  const router = useRouter();
  const pathname = usePathname();
  const selectedFeatureId = useSelectedFeatureId();
  const clickSound = useSoundAction('click');
  const { guardedNavigate } = useDrawerCloseGuard();
  const { fitView } = useReactFlow();
  const drawerTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const {
    defaultViewport,
    onMoveEnd: handleViewportChange,
    resetViewport,
  } = useViewportPersistence();

  const {
    nodes,
    edges,
    onNodesChange,
    handleConnect,
    handleAddRepository,
    handleDeleteFeature,
    handleDeleteRepository,
    createFeatureNode,
    setCallbacks,
  } = useControlCenterState(initialNodes, initialEdges);

  // Publish sidebar features to context whenever feature node data changes
  const { setFeatures: setSidebarFeatures } = useSidebarFeaturesContext();

  const featureNodes = useMemo(() => nodes.filter((n) => n.type === 'featureNode'), [nodes]);

  const sidebarKey = useMemo(() => {
    return featureNodes
      .map((n) => {
        const d = n.data as FeatureNodeData;
        return `${d.featureId}:${d.state}:${d.name}`;
      })
      .sort()
      .join(',');
  }, [featureNodes]);

  useEffect(() => {
    const sidebarItems = featureNodes
      .map((n) => {
        const d = n.data as FeatureNodeData;
        const status = mapNodeStateToSidebarStatus(d.state);
        if (!status) return null;
        return {
          featureId: d.featureId,
          name: d.name,
          status,
          ...(d.startedAt != null && { startedAt: d.startedAt }),
          ...(d.runtime != null && { duration: d.runtime }),
          ...(d.agentType && { agentType: d.agentType }),
          ...(d.modelId && { modelId: d.modelId }),
        };
      })
      .filter(Boolean) as {
      featureId: string;
      name: string;
      status: 'action-needed' | 'in-progress' | 'done';
      startedAt?: number;
      duration?: string;
      agentType?: string;
      modelId?: string;
    }[];

    setSidebarFeatures(sidebarItems);
  }, [sidebarKey, featureNodes, setSidebarFeatures]);

  // ── URL-based navigation handlers ────────────────────────────────────

  const handleNodeClick = useCallback(
    (_event: React.MouseEvent, node: CanvasNodeType) => {
      if (node.type === 'featureNode') {
        const data = node.data as FeatureNodeData;
        if (data.state === 'creating') return;
        guardedNavigate(() => {
          clickSound.play();
          router.push(`/feature/${data.featureId}`);
        });
      }
    },
    [router, clickSound, guardedNavigate]
  );

  const handleAddFeature = useCallback(() => {
    clickSound.play();
    router.push('/create');
  }, [router, clickSound]);

  const handleAddFeatureToRepo = useCallback(
    (repoNodeId: string) => {
      clickSound.play();
      const node = nodes.find((n) => n.id === repoNodeId);
      const repoPath = (node?.data as { repositoryPath?: string } | undefined)?.repositoryPath;
      if (repoPath) {
        router.push(`/create?repo=${encodeURIComponent(repoPath)}`);
      } else {
        router.push('/create');
      }
    },
    [nodes, router, clickSound]
  );

  const handleAddFeatureToFeature = useCallback(
    (featureNodeId: string) => {
      const featureId = featureNodeId.startsWith('feat-') ? featureNodeId.slice(5) : featureNodeId;
      // Find the repo node that owns this feature
      const repoEdge = edges.find((e) => e.target === featureNodeId);
      const repoNode = repoEdge ? nodes.find((n) => n.id === repoEdge.source) : null;
      const repoPath = (repoNode?.data as { repositoryPath?: string } | undefined)?.repositoryPath;

      clickSound.play();
      const params = new URLSearchParams();
      if (repoPath) params.set('repo', repoPath);
      params.set('parent', featureId);
      router.push(`/create?${params.toString()}`);
    },
    [nodes, edges, router, clickSound]
  );

  const handleRepositoryClick = useCallback(
    (nodeId: string) => {
      const node = nodes.find((n) => n.id === nodeId);
      if (node?.type === 'repositoryNode') {
        const data = node.data as RepositoryNodeData;
        if (data.id) {
          guardedNavigate(() => router.push(`/repository/${data.id}`));
        }
      }
    },
    [nodes, router, guardedNavigate]
  );

  // Close all drawers — navigate back to root
  const handleClearDrawers = useCallback(() => {
    if (pathname !== '/') {
      guardedNavigate(() => router.push('/'));
    }
  }, [router, pathname, guardedNavigate]);

  // Listen for global "add repository" events from the top bar button
  useEffect(() => {
    const handler = (e: Event) => {
      const path = (e as CustomEvent<{ path: string }>).detail.path;
      const { wasEmpty, repoPath } = handleAddRepository(path);

      if (wasEmpty) {
        // Wait for next render so the repo node exists in the DOM, then auto-focus
        setTimeout(() => {
          fitView(AUTO_FOCUS_OPTIONS);

          // Open the create-feature drawer after the fitView animation completes
          drawerTimerRef.current = setTimeout(() => {
            guardedNavigate(() => router.push(`/create?repo=${encodeURIComponent(repoPath)}`));
          }, AUTO_FOCUS_DRAWER_DELAY_MS);
        }, 0);
      }
    };
    window.addEventListener('shep:add-repository', handler);
    return () => {
      window.removeEventListener('shep:add-repository', handler);
      if (drawerTimerRef.current != null) {
        clearTimeout(drawerTimerRef.current);
      }
    };
  }, [handleAddRepository, fitView, guardedNavigate, router]);

  // Listen for create events from the create drawer (with real feature ID from server)
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (
        e as CustomEvent<{
          featureId: string;
          name: string;
          description?: string;
          repositoryPath: string;
          parentId?: string;
        }>
      ).detail;

      // When a parentId is provided, connect to the parent feature node
      // via a dependency edge instead of the repo node.
      if (detail.parentId) {
        const parentNodeId = `feat-${detail.parentId}`;
        createFeatureNode(
          parentNodeId,
          {
            state: 'creating',
            featureId: detail.featureId,
            name: detail.name,
            description: detail.description,
            repositoryPath: detail.repositoryPath,
          },
          'dependencyEdge'
        );
        return;
      }

      // Find the repo node to connect to
      const repoNode = nodes.find(
        (n) =>
          n.type === 'repositoryNode' &&
          (n.data as { repositoryPath?: string }).repositoryPath === detail.repositoryPath
      );

      createFeatureNode(repoNode?.id ?? null, {
        state: 'running',
        featureId: detail.featureId,
        name: detail.name,
        description: detail.description,
        repositoryPath: detail.repositoryPath,
      });
    };
    window.addEventListener('shep:feature-created', handler);
    return () => window.removeEventListener('shep:feature-created', handler);
  }, [nodes, createFeatureNode]);

  // Wire callbacks into derived node data (via ref — no re-render).
  useEffect(() => {
    setCallbacks({
      onNodeAction: handleAddFeatureToFeature,
      onFeatureDelete: handleDeleteFeature,
      onRepositoryAdd: handleAddFeatureToRepo,
      onRepositoryClick: handleRepositoryClick,
      onRepositoryDelete: handleDeleteRepository,
    });
  }, [
    setCallbacks,
    handleAddFeatureToFeature,
    handleDeleteFeature,
    handleAddFeatureToRepo,
    handleRepositoryClick,
    handleDeleteRepository,
  ]);

  const handleMoveEnd = useCallback(
    (_event: unknown, viewport: Viewport) => {
      handleViewportChange(viewport);
    },
    [handleViewportChange]
  );

  const hasRepositories = nodes.some((n) => n.type === 'repositoryNode');

  if (!hasRepositories) {
    return <ControlCenterEmptyState onRepositorySelect={handleAddRepository} />;
  }

  return (
    <FeaturesCanvas
      nodes={nodes}
      edges={edges}
      selectedFeatureId={selectedFeatureId}
      defaultViewport={defaultViewport}
      onNodesChange={onNodesChange}
      onConnect={handleConnect}
      onAddFeature={handleAddFeature}
      onNodeClick={handleNodeClick}
      onPaneClick={handleClearDrawers}
      onMoveEnd={handleMoveEnd}
      onResetViewport={resetViewport}
      emptyState={<ControlCenterEmptyState onRepositorySelect={handleAddRepository} />}
    />
  );
}
