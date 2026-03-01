import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// --- Mocks ---

const mockPlay = vi.fn();
vi.mock('@/hooks/use-sound-action', () => ({
  useSoundAction: () => ({ play: mockPlay, stop: vi.fn(), isPlaying: false }),
}));

const mockRefresh = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: mockRefresh }),
}));

const mockCreateFeature = vi.fn();
const mockDeleteFeature = vi.fn();
const mockAddRepository = vi.fn();
const mockDeleteRepository = vi.fn();

vi.mock('@/app/actions/create-feature', () => ({
  createFeature: (...args: unknown[]) => mockCreateFeature(...args),
}));

vi.mock('@/app/actions/delete-feature', () => ({
  deleteFeature: (...args: unknown[]) => mockDeleteFeature(...args),
}));

vi.mock('@/app/actions/add-repository', () => ({
  addRepository: (...args: unknown[]) => mockAddRepository(...args),
}));

vi.mock('@/app/actions/delete-repository', () => ({
  deleteRepository: (...args: unknown[]) => mockDeleteRepository(...args),
}));

const mockToastSuccess = vi.fn();
const mockToastError = vi.fn();
vi.mock('sonner', () => ({
  toast: Object.assign(vi.fn(), {
    success: (...args: unknown[]) => mockToastSuccess(...args),
    error: (...args: unknown[]) => mockToastError(...args),
  }),
}));

import { useOptimisticUpdates } from '@/hooks/use-optimistic-updates';
import type { UseOptimisticUpdatesOptions } from '@/hooks/use-optimistic-updates';

function createMockOptions(): UseOptimisticUpdatesOptions {
  return {
    createFeatureNode: vi.fn().mockReturnValue('feature-123-0'),
    removeNode: vi.fn(),
    removeEdge: vi.fn(),
    clearSelection: vi.fn(),
    setIsCreateDrawerOpen: vi.fn(),
  };
}

describe('useOptimisticUpdates', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAddRepository.mockResolvedValue({ repository: { id: 'repo-1', path: '/test' } });
  });

  describe('handleCreateFeatureSubmit', () => {
    it('calls createFeatureNode with creating state and fires server action', async () => {
      mockCreateFeature.mockResolvedValue({ feature: { id: '1' } });
      const options = createMockOptions();

      const { result } = renderHook(() => useOptimisticUpdates(options));

      await act(async () => {
        result.current.handleCreateFeatureSubmit(
          {
            name: 'My Feature',
            description: 'A test feature',
            attachments: [],
            repositoryPath: '/Users/foo/bar',
            approvalGates: { allowPrd: false, allowPlan: false, allowMerge: false },
            push: true,
            openPr: true,
          },
          { sourceNodeId: 'repo-1' }
        );
      });

      expect(options.createFeatureNode).toHaveBeenCalledWith(
        'repo-1',
        expect.objectContaining({
          state: 'creating',
          name: 'My Feature',
          description: 'A test feature',
          repositoryPath: '/Users/foo/bar',
        }),
        undefined
      );
      expect(mockCreateFeature).toHaveBeenCalled();
    });

    it('closes drawer immediately on submit', async () => {
      mockCreateFeature.mockResolvedValue({ feature: { id: '1' } });
      const options = createMockOptions();

      const { result } = renderHook(() => useOptimisticUpdates(options));

      await act(async () => {
        result.current.handleCreateFeatureSubmit(
          {
            name: 'Test',
            attachments: [],
            repositoryPath: '/test',
            approvalGates: { allowPrd: false, allowPlan: false, allowMerge: false },
            push: true,
            openPr: true,
          },
          { sourceNodeId: null }
        );
      });

      expect(options.setIsCreateDrawerOpen).toHaveBeenCalledWith(false);
    });

    it('plays create sound on successful creation', async () => {
      mockCreateFeature.mockResolvedValue({ feature: { id: '1' } });
      const options = createMockOptions();

      const { result } = renderHook(() => useOptimisticUpdates(options));

      await act(async () => {
        result.current.handleCreateFeatureSubmit(
          {
            name: 'Test',
            attachments: [],
            repositoryPath: '/test',
            approvalGates: { allowPrd: false, allowPlan: false, allowMerge: false },
            push: true,
            openPr: true,
          },
          { sourceNodeId: null }
        );
      });

      expect(mockPlay).toHaveBeenCalled();
      expect(mockRefresh).toHaveBeenCalled();
    });

    it('rolls back on server error and shows error toast', async () => {
      mockCreateFeature.mockResolvedValue({ error: 'Worktree creation failed' });
      const options = createMockOptions();

      const { result } = renderHook(() => useOptimisticUpdates(options));

      await act(async () => {
        result.current.handleCreateFeatureSubmit(
          {
            name: 'Test',
            attachments: [],
            repositoryPath: '/test',
            approvalGates: { allowPrd: false, allowPlan: false, allowMerge: false },
            push: true,
            openPr: true,
          },
          { sourceNodeId: null }
        );
      });

      expect(options.removeNode).toHaveBeenCalledWith('feature-123-0');
      expect(options.removeEdge).toHaveBeenCalledWith('feature-123-0');
      expect(mockToastError).toHaveBeenCalledWith('Worktree creation failed');
    });

    it('rolls back on network failure', async () => {
      mockCreateFeature.mockRejectedValue(new Error('Network error'));
      const options = createMockOptions();

      const { result } = renderHook(() => useOptimisticUpdates(options));

      await act(async () => {
        result.current.handleCreateFeatureSubmit(
          {
            name: 'Test',
            attachments: [],
            repositoryPath: '/test',
            approvalGates: { allowPrd: false, allowPlan: false, allowMerge: false },
            push: true,
            openPr: true,
          },
          { sourceNodeId: null }
        );
      });

      expect(options.removeNode).toHaveBeenCalledWith('feature-123-0');
      expect(mockToastError).toHaveBeenCalledWith('Failed to create feature');
    });

    it('uses dependency edge type when parentFeatureId is provided', async () => {
      mockCreateFeature.mockResolvedValue({ feature: { id: '1' } });
      const options = createMockOptions();

      const { result } = renderHook(() => useOptimisticUpdates(options));

      await act(async () => {
        result.current.handleCreateFeatureSubmit(
          {
            name: 'Child Feature',
            attachments: [],
            repositoryPath: '/test',
            approvalGates: { allowPrd: false, allowPlan: false, allowMerge: false },
            push: true,
            openPr: true,
          },
          { sourceNodeId: 'feat-parent', parentFeatureId: 'parent-id' }
        );
      });

      expect(options.createFeatureNode).toHaveBeenCalledWith(
        'feat-parent',
        expect.any(Object),
        'dependencyEdge'
      );
    });
  });

  describe('handleDeleteFeature', () => {
    it('sets isDeleting during action and resets on completion', async () => {
      let resolvePromise: (v: { feature?: { id: string } }) => void;
      mockDeleteFeature.mockReturnValue(
        new Promise((resolve) => {
          resolvePromise = resolve;
        })
      );

      const options = createMockOptions();
      const { result } = renderHook(() => useOptimisticUpdates(options));

      expect(result.current.isDeleting).toBe(false);

      let deletePromise: Promise<void>;
      act(() => {
        deletePromise = result.current.handleDeleteFeature('feat-1');
      });

      expect(result.current.isDeleting).toBe(true);

      await act(async () => {
        resolvePromise!({ feature: { id: 'f1' } });
        await deletePromise!;
      });

      expect(result.current.isDeleting).toBe(false);
    });

    it('calls deleteFeature server action', async () => {
      mockDeleteFeature.mockResolvedValue({ feature: { id: 'f1' } });
      const options = createMockOptions();

      const { result } = renderHook(() => useOptimisticUpdates(options));

      await act(async () => {
        await result.current.handleDeleteFeature('feat-1');
      });

      expect(mockDeleteFeature).toHaveBeenCalledWith('feat-1');
    });

    it('clears selection and shows success toast on success', async () => {
      mockDeleteFeature.mockResolvedValue({ feature: { id: 'f1' } });
      const options = createMockOptions();

      const { result } = renderHook(() => useOptimisticUpdates(options));

      await act(async () => {
        await result.current.handleDeleteFeature('feat-1');
      });

      expect(options.clearSelection).toHaveBeenCalled();
      expect(mockToastSuccess).toHaveBeenCalledWith('Feature deleted successfully');
      expect(mockRefresh).toHaveBeenCalled();
    });

    it('shows error toast on server error', async () => {
      mockDeleteFeature.mockResolvedValue({ error: 'Feature has active processes' });
      const options = createMockOptions();

      const { result } = renderHook(() => useOptimisticUpdates(options));

      await act(async () => {
        await result.current.handleDeleteFeature('feat-1');
      });

      expect(mockToastError).toHaveBeenCalledWith('Feature has active processes');
    });

    it('shows generic error toast on network failure', async () => {
      mockDeleteFeature.mockRejectedValue(new Error('Network error'));
      const options = createMockOptions();

      const { result } = renderHook(() => useOptimisticUpdates(options));

      await act(async () => {
        await result.current.handleDeleteFeature('feat-1');
      });

      expect(mockToastError).toHaveBeenCalledWith('Failed to delete feature');
    });
  });

  describe('handleDeleteRepository', () => {
    it('calls removeNode and removeEdge, then server action', async () => {
      mockDeleteRepository.mockResolvedValue({ success: true });
      const options = createMockOptions();

      const { result } = renderHook(() => useOptimisticUpdates(options));

      await act(async () => {
        await result.current.handleDeleteRepository('repo-123');
      });

      expect(options.removeNode).toHaveBeenCalledWith('repo-repo-123');
      expect(options.removeEdge).toHaveBeenCalledWith('repo-repo-123');
      expect(mockDeleteRepository).toHaveBeenCalledWith('repo-123');
      expect(mockToastSuccess).toHaveBeenCalledWith('Repository removed');
    });

    it('shows error toast and refreshes on server error', async () => {
      mockDeleteRepository.mockResolvedValue({ success: false, error: 'DB error' });
      const options = createMockOptions();

      const { result } = renderHook(() => useOptimisticUpdates(options));

      await act(async () => {
        await result.current.handleDeleteRepository('repo-123');
      });

      expect(mockToastError).toHaveBeenCalledWith('DB error');
      expect(mockRefresh).toHaveBeenCalled();
    });
  });
});
