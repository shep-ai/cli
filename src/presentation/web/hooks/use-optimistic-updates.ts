'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import type { FeatureNodeData } from '@/components/common/feature-node';
import type { FeatureCreatePayload } from '@/components/common/feature-create-drawer';
import { createFeature } from '@/app/actions/create-feature';
import { deleteFeature } from '@/app/actions/delete-feature';
import { addRepository } from '@/app/actions/add-repository';
import { deleteRepository } from '@/app/actions/delete-repository';
import { useSoundAction } from '@/hooks/use-sound-action';

export interface UseOptimisticUpdatesOptions {
  /** Inserts an optimistic feature node. Returns the generated node ID. */
  createFeatureNode: (
    sourceNodeId: string | null,
    dataOverride?: Partial<FeatureNodeData>,
    edgeType?: string
  ) => string;
  /** Removes a node by its ID from the node list. */
  removeNode: (nodeId: string) => void;
  /** Removes all edges connected to a node ID. */
  removeEdge: (nodeId: string) => void;
  /** Clears the currently selected feature. */
  clearSelection: () => void;
  /** Controls the create drawer open/close state. */
  setIsCreateDrawerOpen: (open: boolean) => void;
}

export interface CreateFeatureContext {
  /** Source node to connect from (repo or parent feature node). */
  sourceNodeId: string | null;
  /** If creating a child feature, the parent's feature ID. */
  parentFeatureId?: string;
}

export interface UseOptimisticUpdatesResult {
  handleCreateFeatureSubmit: (data: FeatureCreatePayload, context: CreateFeatureContext) => void;
  handleDeleteFeature: (featureId: string) => Promise<void>;
  handleDeleteRepository: (repositoryId: string) => Promise<void>;
  handleAddRepository: (path: string) => void;
  isDeleting: boolean;
}

/**
 * Encapsulates optimistic CRUD operations for features and repositories.
 *
 * Pattern: optimistic UI insertion → server action → reconciliation or rollback.
 * Accepts callbacks for node mutation (addNode, removeNode) to stay decoupled
 * from React Flow state.
 */
export function useOptimisticUpdates(
  options: UseOptimisticUpdatesOptions
): UseOptimisticUpdatesResult {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const deleteSound = useSoundAction('delete');
  const createSound = useSoundAction('create');

  const handleCreateFeatureSubmit = useCallback(
    (data: FeatureCreatePayload, context: CreateFeatureContext) => {
      const edgeType = context.parentFeatureId ? 'dependencyEdge' : undefined;
      const tempId = options.createFeatureNode(
        context.sourceNodeId,
        {
          state: 'creating',
          name: data.name,
          description: data.description,
          repositoryPath: data.repositoryPath,
        },
        edgeType
      );

      // Close drawer immediately
      options.setIsCreateDrawerOpen(false);

      // Fire server action in the background
      createFeature(data)
        .then((result) => {
          if (result.error) {
            options.removeNode(tempId);
            options.removeEdge(tempId);
            toast.error(result.error);
            return;
          }

          createSound.play();
          router.refresh();
        })
        .catch(() => {
          options.removeNode(tempId);
          options.removeEdge(tempId);
          toast.error('Failed to create feature');
        });
    },
    [options, router, createSound]
  );

  const handleDeleteFeature = useCallback(
    async (featureId: string) => {
      setIsDeleting(true);
      try {
        const result = await deleteFeature(featureId);

        if (result.error) {
          toast.error(result.error);
          return;
        }

        options.clearSelection();
        deleteSound.play();
        toast.success('Feature deleted successfully');
        router.refresh();
      } catch {
        toast.error('Failed to delete feature');
      } finally {
        setIsDeleting(false);
      }
    },
    [router, deleteSound, options]
  );

  const handleDeleteRepository = useCallback(
    async (repositoryId: string) => {
      const repoNodeId = `repo-${repositoryId}`;

      // Optimistic: remove node and its edges immediately
      options.removeNode(repoNodeId);
      options.removeEdge(repoNodeId);

      try {
        const result = await deleteRepository(repositoryId);

        if (!result.success) {
          toast.error(result.error ?? 'Failed to remove repository');
          router.refresh();
          return;
        }

        deleteSound.play();
        toast.success('Repository removed');
        router.refresh();
      } catch {
        toast.error('Failed to remove repository');
        router.refresh();
      }
    },
    [router, deleteSound, options]
  );

  const handleAddRepository = useCallback(
    (path: string) => {
      const repoName =
        path
          .replace(/[\\/]+$/, '')
          .split(/[\\/]/)
          .pop() ?? path;

      // Persist via server action
      addRepository({ path, name: repoName })
        .then((result) => {
          if (result.error) {
            toast.error(result.error);
            return;
          }

          createSound.play();
          router.refresh();
        })
        .catch(() => {
          toast.error('Failed to add repository');
        });
    },
    [router, createSound]
  );

  return {
    handleCreateFeatureSubmit,
    handleDeleteFeature,
    handleDeleteRepository,
    handleAddRepository,
    isDeleting,
  };
}
