'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
    handleRetryFeature,
    handleStartFeature,
    handleStopFeature,
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
    (event: React.MouseEvent, node: CanvasNodeType) => {
      if (node.type === 'featureNode') {
        const data = node.data as FeatureNodeData;
        if (data.state === 'creating' || data.state === 'deleting') return;
        // Only navigate when the click lands on the card itself, not on
        // overlay buttons (delete, add) or pointer events leaking from dialogs.
        const target = event.target as HTMLElement;
        if (!target.closest('[data-testid="feature-node-card"]')) return;
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

  // Listen for delete requests from the feature drawer (fires when the user
  // confirms delete inside the drawer). Delegates to handleDeleteFeature so
  // the canvas gets optimistic state, mutation guard, and node removal.
  useEffect(() => {
    const handler = (e: Event) => {
      const { featureId, cleanup, cascadeDelete } = (
        e as CustomEvent<{ featureId: string; cleanup?: boolean; cascadeDelete?: boolean }>
      ).detail;
      handleDeleteFeature(featureId, cleanup, cascadeDelete);
    };
    window.addEventListener('shep:feature-delete-requested', handler);
    return () => window.removeEventListener('shep:feature-delete-requested', handler);
  }, [handleDeleteFeature]);

  // Wire callbacks into derived node data (via ref — no re-render).
  useEffect(() => {
    setCallbacks({
      onNodeAction: handleAddFeatureToFeature,
      onFeatureDelete: handleDeleteFeature,
      onRetryFeature: handleRetryFeature,
      onStartFeature: handleStartFeature,
      onStopFeature: handleStopFeature,
      onRepositoryAdd: handleAddFeatureToRepo,
      onRepositoryClick: handleRepositoryClick,
      onRepositoryDelete: handleDeleteRepository,
    });
  }, [
    setCallbacks,
    handleAddFeatureToFeature,
    handleDeleteFeature,
    handleRetryFeature,
    handleStartFeature,
    handleStopFeature,
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

  // Debounced latch: prevent empty-state flicker during brief reconcile gaps
  // (e.g. stale poll momentarily drops repos), but allow the empty state to
  // return after a real delete once repos stay gone past the debounce window.
  const [showCanvas, setShowCanvas] = useState(hasRepositories);
  const latchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (hasRepositories) {
      // Repos exist — show canvas immediately, cancel any pending unlatch
      if (latchTimerRef.current) {
        clearTimeout(latchTimerRef.current);
        latchTimerRef.current = null;
      }
      setShowCanvas(true);
    } else if (showCanvas) {
      // Repos gone — wait before showing empty state (debounce stale polls)
      latchTimerRef.current = setTimeout(() => {
        setShowCanvas(false);
        latchTimerRef.current = null;
      }, 500);
    }
    return () => {
      if (latchTimerRef.current) clearTimeout(latchTimerRef.current);
    };
  }, [hasRepositories, showCanvas]);

  // Pulse the "+" button when there's a single repo with no features and the
  // create-feature drawer is not open — draws attention to the next action.
  const isCreateDrawerOpen = pathname.startsWith('/create');
  const displayNodes = useMemo(() => {
    const repoNodes = nodes.filter((n) => n.type === 'repositoryNode');
    const hasFeatures = nodes.some((n) => n.type === 'featureNode');
    const shouldPulse = repoNodes.length === 1 && !hasFeatures && !isCreateDrawerOpen;

    if (!shouldPulse) return nodes;

    return nodes.map((n) =>
      n.type === 'repositoryNode' ? { ...n, data: { ...n.data, pulseAdd: true } } : n
    );
  }, [nodes, isCreateDrawerOpen]);

  return (
    <FeaturesCanvas
      nodes={showCanvas ? displayNodes : []}
      edges={showCanvas ? edges : []}
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
