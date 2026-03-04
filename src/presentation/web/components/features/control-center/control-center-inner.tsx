'use client';

import { useCallback, useEffect, useMemo } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import type { Edge } from '@xyflow/react';
import { FeaturesCanvas } from '@/components/features/features-canvas';
import type { CanvasNodeType } from '@/components/features/features-canvas';
import type { FeatureNodeData } from '@/components/common/feature-node';
import type { RepositoryNodeData } from '@/components/common/repository-node';
import { NotificationPermissionBanner } from '@/components/common/notification-permission-banner';
import {
  useSidebarFeaturesContext,
  mapNodeStateToSidebarStatus,
} from '@/hooks/sidebar-features-context';
import { useSelectedFeatureId } from '@/hooks/use-selected-feature-id';
import { useSoundAction } from '@/hooks/use-sound-action';
import { useDrawerCloseGuard } from '@/hooks/drawer-close-guard';
import { ControlCenterEmptyState } from './control-center-empty-state';
import { useControlCenterState } from './use-control-center-state';

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

  const {
    nodes,
    edges,
    onNodesChange,
    handleConnect,
    handleAddRepository,
    handleDeleteFeature,
    handleResumeFeature,
    handleDeleteRepository,
    createFeatureNode,
  } = useControlCenterState(initialNodes, initialEdges);

  // Publish sidebar features to context whenever feature node data changes
  const { setFeatures: setSidebarFeatures } = useSidebarFeaturesContext();

  const sidebarKey = useMemo(() => {
    return nodes
      .filter((n) => n.type === 'featureNode')
      .map((n) => {
        const d = n.data as FeatureNodeData;
        return `${d.featureId}:${d.state}:${d.runtime ?? ''}:${d.startedAt ?? ''}`;
      })
      .sort()
      .join(',');
  }, [nodes]);

  useEffect(() => {
    const sidebarItems = nodes
      .filter((n) => n.type === 'featureNode')
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
        };
      })
      .filter(Boolean) as {
      featureId: string;
      name: string;
      status: 'action-needed' | 'in-progress' | 'done';
      startedAt?: number;
      duration?: string;
    }[];

    setSidebarFeatures(sidebarItems);
  }, [sidebarKey, nodes, setSidebarFeatures]);

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
      handleAddRepository(path);
    };
    window.addEventListener('shep:add-repository', handler);
    return () => window.removeEventListener('shep:add-repository', handler);
  }, [handleAddRepository]);

  // Listen for optimistic create events from the create drawer
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (
        e as CustomEvent<{
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
        state: 'creating',
        name: detail.name,
        description: detail.description,
        repositoryPath: detail.repositoryPath,
      });
    };
    window.addEventListener('shep:feature-created', handler);
    return () => window.removeEventListener('shep:feature-created', handler);
  }, [nodes, createFeatureNode]);

  const hasRepositories = nodes.some((n) => n.type === 'repositoryNode');

  if (!hasRepositories) {
    return (
      <>
        <NotificationPermissionBanner />
        <ControlCenterEmptyState onRepositorySelect={handleAddRepository} />
      </>
    );
  }

  return (
    <>
      <NotificationPermissionBanner />
      <FeaturesCanvas
        nodes={nodes}
        edges={edges}
        selectedFeatureId={selectedFeatureId}
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
        onFeatureRetry={handleResumeFeature}
        onRepositorySelect={handleAddRepository}
        emptyState={<ControlCenterEmptyState onRepositorySelect={handleAddRepository} />}
      />
    </>
  );
}
