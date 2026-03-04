import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act, fireEvent } from '@testing-library/react';
import type { Edge } from '@xyflow/react';
import { useControlCenterState } from '@/components/features/control-center/use-control-center-state';
import type { ControlCenterState } from '@/components/features/control-center/use-control-center-state';
import type { FeatureNodeType, FeatureNodeData } from '@/components/common/feature-node';
import type { RepositoryNodeType } from '@/components/common/repository-node';
import type { AddRepositoryNodeType } from '@/components/common/add-repository-node';
import type { CanvasNodeType } from '@/components/features/features-canvas';

// --- Mocks ---

const mockRefresh = vi.fn();
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: mockRefresh, push: mockPush }),
}));

vi.mock('@/hooks/agent-events-provider', () => ({
  useAgentEventsContext: () => ({
    events: [],
    lastEvent: null,
    connectionStatus: 'connected' as const,
  }),
}));

const mockToastSuccess = vi.fn();
const mockToastError = vi.fn();
vi.mock('sonner', () => ({
  toast: Object.assign(vi.fn(), {
    success: (...args: unknown[]) => mockToastSuccess(...args),
    error: (...args: unknown[]) => mockToastError(...args),
  }),
}));

// --- Server action mocks ---
const mockDeleteFeature = vi.fn();
const mockAddRepository = vi.fn();
const mockDeleteRepository = vi.fn();

vi.mock('@/app/actions/delete-feature', () => ({
  deleteFeature: (...args: unknown[]) => mockDeleteFeature(...args),
}));

vi.mock('@/app/actions/add-repository', () => ({
  addRepository: (...args: unknown[]) => mockAddRepository(...args),
}));

vi.mock('@/app/actions/delete-repository', () => ({
  deleteRepository: (...args: unknown[]) => mockDeleteRepository(...args),
}));

const mockFeatureNode: FeatureNodeType = {
  id: 'feat-1',
  type: 'featureNode',
  position: { x: 100, y: 100 },
  data: {
    name: 'Auth Module',
    featureId: '#f1',
    lifecycle: 'implementation',
    state: 'running',
    progress: 45,
    repositoryPath: '/home/user/my-repo',
    branch: 'feat/auth-module',
  },
};

const mockRepoNode: RepositoryNodeType = {
  id: 'repo-1',
  type: 'repositoryNode',
  position: { x: 0, y: 0 },
  data: {
    name: 'shep-ai/cli',
  },
};

const mockAddRepoNode: AddRepositoryNodeType = {
  id: 'add-repo',
  type: 'addRepositoryNode',
  position: { x: 50, y: 50 },
  data: {},
};

/**
 * Test harness that renders the hook and exposes state via DOM + callback.
 * No ReactFlowProvider needed — the hook uses plain useState.
 */
function HookTestHarness({
  initialNodes = [],
  initialEdges = [],
  onStateChange,
  isRefreshBlocked,
}: {
  initialNodes?: CanvasNodeType[];
  initialEdges?: Edge[];
  onStateChange?: (state: ControlCenterState) => void;
  isRefreshBlocked?: () => boolean;
}) {
  const state = useControlCenterState(initialNodes, initialEdges, isRefreshBlocked);

  if (onStateChange) {
    onStateChange(state);
  }

  return (
    <>
      <div data-testid="node-count">{state.nodes.length}</div>
      <div data-testid="edge-count">{state.edges.length}</div>
      <button data-testid="add-repository" onClick={() => state.handleAddRepository('my-org/repo')}>
        Add Repository
      </button>
      <button data-testid="delete-feature" onClick={() => state.handleDeleteFeature('feat-1')}>
        Delete Feature
      </button>
      <button
        data-testid="add-to-feature-creating"
        onClick={() =>
          state.createFeatureNode('repo-1', { state: 'creating', name: 'Optimistic Feature' })
        }
      >
        Add Creating Feature
      </button>
    </>
  );
}

function renderHook(
  initialNodes: CanvasNodeType[] = [],
  initialEdges: Edge[] = [],
  onStateChange?: (state: ControlCenterState) => void
) {
  return render(
    <HookTestHarness
      initialNodes={initialNodes}
      initialEdges={initialEdges}
      onStateChange={onStateChange}
    />
  );
}

describe('useControlCenterState', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
    // Default: addRepository resolves successfully so handleAddRepository .then() doesn't throw
    mockAddRepository.mockResolvedValue({ repository: { id: 'test-repo-id', path: '/test' } });
  });

  it('initializes with provided nodes and edges', () => {
    renderHook([mockFeatureNode, mockRepoNode] as CanvasNodeType[], [
      { id: 'e1', source: 'repo-1', target: 'feat-1' },
    ]);
    expect(screen.getByTestId('node-count')).toHaveTextContent('2');
    expect(screen.getByTestId('edge-count')).toHaveTextContent('1');
  });

  describe('createFeatureNode state override and return value', () => {
    it('returns the generated node ID via createFeatureNode', () => {
      let capturedState: ControlCenterState | null = null;
      renderHook([mockFeatureNode] as CanvasNodeType[], [], (state) => {
        capturedState = state;
      });

      const nodeCountBefore = capturedState!.nodes.length;

      // Use createFeatureNode directly (via add-to-feature-creating button which calls createFeatureNode)
      act(() => {
        fireEvent.click(screen.getByTestId('add-to-feature-creating'));
      });

      // A new node should have been added
      expect(capturedState!.nodes.length).toBe(nodeCountBefore + 1);
      // The new node should have an ID matching the feature-{timestamp}-{counter} pattern
      const newNode = capturedState!.nodes.find(
        (n) => n.type === 'featureNode' && (n.data as FeatureNodeData).state === 'creating'
      );
      expect(newNode).toBeDefined();
      expect(newNode!.id).toMatch(/^feature-\d+-\d+$/);
    });

    it('creates a node with state "creating" when dataOverride has state creating', () => {
      let capturedState: ControlCenterState | null = null;
      renderHook([mockRepoNode] as CanvasNodeType[], [], (state) => {
        capturedState = state;
      });

      act(() => {
        fireEvent.click(screen.getByTestId('add-to-feature-creating'));
      });

      // The new node should have state 'creating'
      const newNode = capturedState!.nodes.find(
        (n) => n.type === 'featureNode' && (n.data as FeatureNodeData).state === 'creating'
      );
      expect(newNode).toBeDefined();
    });
  });

  describe('createFeatureNode positioning', () => {
    const parentFeature: FeatureNodeType = {
      id: 'feat-1',
      type: 'featureNode',
      position: { x: 100, y: 100 },
      data: {
        name: 'Parent Feature',
        featureId: '#p',
        lifecycle: 'implementation',
        state: 'running',
        progress: 50,
        repositoryPath: '/home/user/my-repo',
        branch: 'feat/feature-a',
      },
    };

    it('places new child feature to the right of the parent via createFeatureNode', () => {
      let capturedState: ControlCenterState | null = null;
      renderHook([parentFeature] as CanvasNodeType[], [], (state) => {
        capturedState = state;
      });

      // Use createFeatureNode directly
      act(() => {
        capturedState!.createFeatureNode('feat-1');
      });

      const childNode = capturedState!.nodes.find(
        (n) => n.type === 'featureNode' && n.id !== 'feat-1'
      );

      expect(childNode).toBeDefined();
      expect(childNode!.position.x).toBeGreaterThan(parentFeature.position.x);
    });

    it('places two children at distinct Y positions via dagre layout', () => {
      let capturedState: ControlCenterState | null = null;
      renderHook([parentFeature] as CanvasNodeType[], [], (state) => {
        capturedState = state;
      });

      // Add first child
      act(() => {
        capturedState!.createFeatureNode('feat-1');
      });
      const firstChildId = capturedState!.nodes.find(
        (n) => n.type === 'featureNode' && n.id !== 'feat-1'
      )!.id;

      // Add second child
      act(() => {
        capturedState!.createFeatureNode('feat-1');
      });

      const allChildren = capturedState!.nodes.filter(
        (n) => n.type === 'featureNode' && n.id !== 'feat-1'
      );
      expect(allChildren).toHaveLength(2);

      const firstChild = allChildren.find((n) => n.id === firstChildId)!;
      const secondChild = allChildren.find((n) => n.id !== firstChildId)!;

      // Dagre places siblings at different Y positions (not overlapping)
      expect(secondChild.position.y).not.toBe(firstChild.position.y);
    });
  });

  describe('handleAddRepository', () => {
    it('adds a new repository node', () => {
      renderHook([mockAddRepoNode] as CanvasNodeType[]);

      act(() => {
        fireEvent.click(screen.getByTestId('add-repository'));
      });

      expect(screen.getByTestId('node-count')).toHaveTextContent('2');
    });

    it('repositions add-repo node after adding a repository via dagre layout', () => {
      let capturedState: ControlCenterState | null = null;
      renderHook([mockAddRepoNode] as CanvasNodeType[], [], (state) => {
        capturedState = state;
      });

      act(() => {
        fireEvent.click(screen.getByTestId('add-repository'));
      });

      const addRepoAfter = capturedState!.nodes.find((n) => n.type === 'addRepositoryNode');
      // After dagre re-layout, addRepoNode should be repositioned (below the new repo)
      expect(addRepoAfter).toBeDefined();
      // The addRepoNode should have moved from its original position
      const repoNode = capturedState!.nodes.find((n) => n.type === 'repositoryNode');
      expect(repoNode).toBeDefined();
      // Both nodes should exist and not overlap (addRepo below repo)
      expect(addRepoAfter!.position.y).not.toBe(repoNode!.position.y);
    });

    it('creates repo node with selected path as name', () => {
      let capturedState: ControlCenterState | null = null;
      renderHook([mockAddRepoNode] as CanvasNodeType[], [], (state) => {
        capturedState = state;
      });

      act(() => {
        fireEvent.click(screen.getByTestId('add-repository'));
      });

      const repoNode = capturedState!.nodes.find((n) => n.type === 'repositoryNode');
      expect(repoNode).toBeDefined();
      expect((repoNode!.data as { name: string }).name).toBe('repo');
    });

    it('places new repo via dagre layout', () => {
      let capturedState: ControlCenterState | null = null;
      renderHook([mockAddRepoNode] as CanvasNodeType[], [], (state) => {
        capturedState = state;
      });

      act(() => {
        fireEvent.click(screen.getByTestId('add-repository'));
      });

      const repoNode = capturedState!.nodes.find((n) => n.type === 'repositoryNode');
      expect(repoNode).toBeDefined();
      // Dagre assigns positions — just verify it exists and has valid coordinates
      expect(typeof repoNode!.position.x).toBe('number');
      expect(typeof repoNode!.position.y).toBe('number');
    });

    it('stacks multiple repos without overlap via dagre layout', () => {
      let capturedState: ControlCenterState | null = null;
      renderHook([mockAddRepoNode] as CanvasNodeType[], [], (state) => {
        capturedState = state;
      });

      // First add
      act(() => {
        fireEvent.click(screen.getByTestId('add-repository'));
      });

      // Second add
      act(() => {
        fireEvent.click(screen.getByTestId('add-repository'));
      });

      const repoNodes = capturedState!.nodes.filter((n) => n.type === 'repositoryNode');
      const addRepoAfter = capturedState!.nodes.find((n) => n.type === 'addRepositoryNode');

      expect(repoNodes).toHaveLength(2);

      // Repos should not overlap (different Y positions via dagre layout)
      expect(repoNodes[0].position.y).not.toBe(repoNodes[1].position.y);
      // addRepoNode should also exist and not overlap with repos
      expect(addRepoAfter).toBeDefined();
    });

    it('rolls back repo node and re-layouts on server action error', async () => {
      mockAddRepository.mockResolvedValue({ error: 'Repository already exists' });

      let capturedState: ControlCenterState | null = null;
      renderHook([mockAddRepoNode] as CanvasNodeType[], [], (state) => {
        capturedState = state;
      });

      await act(async () => {
        fireEvent.click(screen.getByTestId('add-repository'));
      });

      // Temp repo node should be removed (only addRepoNode remains)
      expect(screen.getByTestId('node-count')).toHaveTextContent('1');
      // addRepoNode should still exist after rollback
      const addRepoAfter = capturedState!.nodes.find((n) => n.type === 'addRepositoryNode');
      expect(addRepoAfter).toBeDefined();
    });

    it('rolls back repo node and re-layouts on network failure', async () => {
      mockAddRepository.mockRejectedValue(new Error('Network error'));

      let capturedState: ControlCenterState | null = null;
      renderHook([mockAddRepoNode] as CanvasNodeType[], [], (state) => {
        capturedState = state;
      });

      await act(async () => {
        fireEvent.click(screen.getByTestId('add-repository'));
      });

      // Temp repo node should be removed (only addRepoNode remains)
      expect(screen.getByTestId('node-count')).toHaveTextContent('1');
      // addRepoNode should still exist after rollback
      const addRepoAfter = capturedState!.nodes.find((n) => n.type === 'addRepositoryNode');
      expect(addRepoAfter).toBeDefined();
    });
  });

  describe('initialNodes/initialEdges prop sync', () => {
    it('syncs local state when initialNodes prop changes (different node IDs)', () => {
      const { rerender } = render(
        <HookTestHarness initialNodes={[mockFeatureNode] as CanvasNodeType[]} initialEdges={[]} />
      );

      expect(screen.getByTestId('node-count')).toHaveTextContent('1');

      const newFeatureNode: FeatureNodeType = {
        id: 'feat-2',
        type: 'featureNode',
        position: { x: 200, y: 200 },
        data: {
          name: 'New Server Feature',
          featureId: '#f2',
          lifecycle: 'requirements',
          state: 'running',
          progress: 0,
          repositoryPath: '/home/user/repo',
          branch: 'feat/new',
        },
      };

      // Simulate router.refresh() delivering new initialNodes
      rerender(
        <HookTestHarness
          initialNodes={[mockFeatureNode, newFeatureNode] as CanvasNodeType[]}
          initialEdges={[]}
        />
      );

      expect(screen.getByTestId('node-count')).toHaveTextContent('2');
    });

    it('syncs local edges when initialEdges prop changes', () => {
      const edge: Edge = { id: 'e1', source: 'repo-1', target: 'feat-1' };

      const { rerender } = render(
        <HookTestHarness
          initialNodes={[mockFeatureNode, mockRepoNode] as CanvasNodeType[]}
          initialEdges={[]}
        />
      );

      expect(screen.getByTestId('edge-count')).toHaveTextContent('0');

      rerender(
        <HookTestHarness
          initialNodes={[mockFeatureNode, mockRepoNode] as CanvasNodeType[]}
          initialEdges={[edge]}
        />
      );

      expect(screen.getByTestId('edge-count')).toHaveTextContent('1');
    });

    it('replaces optimistic node when initialNodes changes to include real feature', () => {
      let capturedState: ControlCenterState | null = null;

      const { rerender } = render(
        <HookTestHarness
          initialNodes={[mockRepoNode] as CanvasNodeType[]}
          initialEdges={[]}
          onStateChange={(state) => {
            capturedState = state;
          }}
        />
      );

      // Add an optimistic node
      act(() => {
        capturedState!.createFeatureNode('repo-1', {
          state: 'creating',
          name: 'My Optimistic Feature',
        });
      });

      // There should now be 2 nodes (repo + optimistic)
      expect(screen.getByTestId('node-count')).toHaveTextContent('2');

      // Simulate server refresh with the real feature (no optimistic node)
      const realFeature: FeatureNodeType = {
        id: 'feat-real-123',
        type: 'featureNode',
        position: { x: 300, y: 100 },
        data: {
          name: 'My Optimistic Feature',
          featureId: '#r123',
          lifecycle: 'requirements',
          state: 'running',
          progress: 0,
          repositoryPath: '/home/user/repo',
          branch: 'feat/optimistic',
        },
      };
      const realEdge: Edge = {
        id: 'edge-repo-1-feat-real-123',
        source: 'repo-1',
        target: 'feat-real-123',
      };

      rerender(
        <HookTestHarness
          initialNodes={[mockRepoNode, realFeature] as CanvasNodeType[]}
          initialEdges={[realEdge]}
          onStateChange={(state) => {
            capturedState = state;
          }}
        />
      );

      // The optimistic node should be gone, replaced by the real feature
      expect(screen.getByTestId('node-count')).toHaveTextContent('2');
      const optimisticNode = capturedState!.nodes.find(
        (n) => n.type === 'featureNode' && (n.data as FeatureNodeData).state === 'creating'
      );
      expect(optimisticNode).toBeUndefined();

      const realNode = capturedState!.nodes.find((n) => n.id === 'feat-real-123');
      expect(realNode).toBeDefined();
    });

    it('does not update when initialNodes have the same IDs (stable comparison)', () => {
      const { rerender } = render(
        <HookTestHarness initialNodes={[mockFeatureNode] as CanvasNodeType[]} initialEdges={[]} />
      );

      // Re-render with identical initialNodes (same IDs)
      rerender(
        <HookTestHarness initialNodes={[mockFeatureNode] as CanvasNodeType[]} initialEdges={[]} />
      );

      // Node count should remain 1 (no extra nodes added, no duplication)
      expect(screen.getByTestId('node-count')).toHaveTextContent('1');
    });
  });

  describe('handleDeleteFeature', () => {
    const featureNode: FeatureNodeType = {
      id: 'feat-1',
      type: 'featureNode',
      position: { x: 100, y: 100 },
      data: {
        name: 'Auth Module',
        featureId: '#f1',
        lifecycle: 'implementation',
        state: 'running',
        progress: 45,
        repositoryPath: '/home/user/my-repo',
        branch: 'feat/auth-module',
      },
    };

    const featureNode2: FeatureNodeType = {
      id: 'feat-2',
      type: 'featureNode',
      position: { x: 400, y: 100 },
      data: {
        name: 'Dashboard',
        featureId: '#f2',
        lifecycle: 'requirements',
        state: 'done',
        progress: 0,
        repositoryPath: '/home/user/my-repo',
        branch: 'feat/dashboard',
      },
    };

    const repoNode: RepositoryNodeType = {
      id: 'repo-1',
      type: 'repositoryNode',
      position: { x: 0, y: 0 },
      data: { name: 'shep-ai/cli' },
    };

    const edgeRepoToFeat1: Edge = {
      id: 'edge-repo-1-feat-1',
      source: 'repo-1',
      target: 'feat-1',
    };

    const edgeFeat1ToFeat2: Edge = {
      id: 'edge-feat-1-feat-2',
      source: 'feat-1',
      target: 'feat-2',
    };

    it('calls deleteFeature server action with correct featureId', async () => {
      mockDeleteFeature.mockResolvedValue({ feature: { id: 'f1' } });

      renderHook([featureNode, repoNode] as CanvasNodeType[], [edgeRepoToFeat1]);

      await act(async () => {
        fireEvent.click(screen.getByTestId('delete-feature'));
      });

      expect(mockDeleteFeature).toHaveBeenCalledWith('feat-1');
    });

    it('removes deleted node from nodes on success', async () => {
      mockDeleteFeature.mockResolvedValue({ feature: { id: 'f1' } });

      renderHook([featureNode, featureNode2, repoNode] as CanvasNodeType[], [
        edgeRepoToFeat1,
        edgeFeat1ToFeat2,
      ]);

      expect(screen.getByTestId('node-count')).toHaveTextContent('3');

      await act(async () => {
        fireEvent.click(screen.getByTestId('delete-feature'));
      });

      // feat-1 removed, feat-2 and repo-1 remain
      expect(screen.getByTestId('node-count')).toHaveTextContent('2');
    });

    it('removes all edges connected to deleted node on success', async () => {
      mockDeleteFeature.mockResolvedValue({ feature: { id: 'f1' } });

      renderHook([featureNode, featureNode2, repoNode] as CanvasNodeType[], [
        edgeRepoToFeat1,
        edgeFeat1ToFeat2,
      ]);

      expect(screen.getByTestId('edge-count')).toHaveTextContent('2');

      await act(async () => {
        fireEvent.click(screen.getByTestId('delete-feature'));
      });

      // Both edges (repo->feat-1 and feat-1->feat-2) should be removed
      expect(screen.getByTestId('edge-count')).toHaveTextContent('0');
    });

    it('shows success toast on successful deletion', async () => {
      mockDeleteFeature.mockResolvedValue({ feature: { id: 'f1' } });

      renderHook([featureNode] as CanvasNodeType[]);

      await act(async () => {
        fireEvent.click(screen.getByTestId('delete-feature'));
      });

      expect(mockToastSuccess).toHaveBeenCalled();
    });

    it('calls router.refresh() on successful deletion', async () => {
      mockDeleteFeature.mockResolvedValue({ feature: { id: 'f1' } });

      renderHook([featureNode] as CanvasNodeType[]);

      await act(async () => {
        fireEvent.click(screen.getByTestId('delete-feature'));
      });

      expect(mockRefresh).toHaveBeenCalled();
    });

    it('shows error toast with server action error message', async () => {
      mockDeleteFeature.mockResolvedValue({ error: 'Feature has active processes' });

      renderHook([featureNode] as CanvasNodeType[]);

      await act(async () => {
        fireEvent.click(screen.getByTestId('delete-feature'));
      });

      expect(mockToastError).toHaveBeenCalledWith('Feature has active processes');
    });

    it('preserves nodes and edges on server action error', async () => {
      mockDeleteFeature.mockResolvedValue({ error: 'Delete failed' });

      renderHook([featureNode, repoNode] as CanvasNodeType[], [edgeRepoToFeat1]);

      await act(async () => {
        fireEvent.click(screen.getByTestId('delete-feature'));
      });

      expect(screen.getByTestId('node-count')).toHaveTextContent('2');
      expect(screen.getByTestId('edge-count')).toHaveTextContent('1');
    });

    it('shows generic error toast on network failure', async () => {
      mockDeleteFeature.mockRejectedValue(new Error('Network error'));

      renderHook([featureNode] as CanvasNodeType[]);

      await act(async () => {
        fireEvent.click(screen.getByTestId('delete-feature'));
      });

      expect(mockToastError).toHaveBeenCalledWith('Failed to delete feature');
    });

    it('preserves state on network failure', async () => {
      mockDeleteFeature.mockRejectedValue(new Error('Network error'));

      renderHook([featureNode, repoNode] as CanvasNodeType[], [edgeRepoToFeat1]);

      await act(async () => {
        fireEvent.click(screen.getByTestId('delete-feature'));
      });

      expect(screen.getByTestId('node-count')).toHaveTextContent('2');
      expect(screen.getByTestId('edge-count')).toHaveTextContent('1');
    });

    it('does not call router.refresh() on error', async () => {
      mockDeleteFeature.mockResolvedValue({ error: 'Delete failed' });

      renderHook([featureNode] as CanvasNodeType[]);

      await act(async () => {
        fireEvent.click(screen.getByTestId('delete-feature'));
      });

      expect(mockRefresh).not.toHaveBeenCalled();
    });

    describe('post-deletion relayout', () => {
      // 3-node chain: repo -> feat-1 -> feat-2
      const chainRepoNode: RepositoryNodeType = {
        id: 'repo-1',
        type: 'repositoryNode',
        position: { x: 0, y: 100 },
        data: { name: 'shep-ai/cli' },
      };

      const chainFeat1: FeatureNodeType = {
        id: 'feat-1',
        type: 'featureNode',
        position: { x: 400, y: 100 },
        data: {
          name: 'Auth Module',
          featureId: '#f1',
          lifecycle: 'implementation',
          state: 'running',
          progress: 45,
          repositoryPath: '/home/user/my-repo',
          branch: 'feat/auth-module',
        },
      };

      const chainFeat2: FeatureNodeType = {
        id: 'feat-2',
        type: 'featureNode',
        position: { x: 800, y: 100 },
        data: {
          name: 'Dashboard',
          featureId: '#f2',
          lifecycle: 'requirements',
          state: 'done',
          progress: 0,
          repositoryPath: '/home/user/my-repo',
          branch: 'feat/dashboard',
        },
      };

      const chainEdgeRepoToFeat1: Edge = {
        id: 'edge-repo-1-feat-1',
        source: 'repo-1',
        target: 'feat-1',
      };

      const chainEdgeFeat1ToFeat2: Edge = {
        id: 'edge-feat-1-feat-2',
        source: 'feat-1',
        target: 'feat-2',
      };

      it('repositions remaining nodes after successful deletion', async () => {
        mockDeleteFeature.mockResolvedValue({ feature: { id: 'f1' } });

        const positionsBefore = new Map<string, { x: number; y: number }>();
        let capturedState: ControlCenterState | null = null;

        render(
          <HookTestHarness
            initialNodes={[chainRepoNode, chainFeat1, chainFeat2] as CanvasNodeType[]}
            initialEdges={[chainEdgeRepoToFeat1, chainEdgeFeat1ToFeat2]}
            onStateChange={(state) => {
              capturedState = state;
            }}
          />
        );

        // Record positions before deletion
        for (const node of capturedState!.nodes) {
          positionsBefore.set(node.id, { ...node.position });
        }

        await act(async () => {
          capturedState!.handleDeleteFeature('feat-1');
        });

        // After deletion + relayout, remaining nodes should have different positions
        const repoAfter = capturedState!.nodes.find((n) => n.id === 'repo-1')!;
        const feat2After = capturedState!.nodes.find((n) => n.id === 'feat-2')!;

        const repoPosBefore = positionsBefore.get('repo-1')!;
        const feat2PosBefore = positionsBefore.get('feat-2')!;

        // At least one remaining node must have moved (relayout repositions them)
        const repoMoved =
          repoAfter.position.x !== repoPosBefore.x || repoAfter.position.y !== repoPosBefore.y;
        const feat2Moved =
          feat2After.position.x !== feat2PosBefore.x || feat2After.position.y !== feat2PosBefore.y;

        expect(repoMoved || feat2Moved).toBe(true);
      });

      it('does not change positions on server action error', async () => {
        mockDeleteFeature.mockResolvedValue({ error: 'Delete failed' });

        const positionsBefore = new Map<string, { x: number; y: number }>();
        let capturedState: ControlCenterState | null = null;

        render(
          <HookTestHarness
            initialNodes={[chainRepoNode, chainFeat1, chainFeat2] as CanvasNodeType[]}
            initialEdges={[chainEdgeRepoToFeat1, chainEdgeFeat1ToFeat2]}
            onStateChange={(state) => {
              capturedState = state;
            }}
          />
        );

        // Record positions before deletion attempt
        for (const node of capturedState!.nodes) {
          positionsBefore.set(node.id, { ...node.position });
        }

        await act(async () => {
          capturedState!.handleDeleteFeature('feat-1');
        });

        // All 3 nodes should still be present with identical positions
        expect(capturedState!.nodes).toHaveLength(3);
        for (const node of capturedState!.nodes) {
          const before = positionsBefore.get(node.id)!;
          expect(node.position.x).toBe(before.x);
          expect(node.position.y).toBe(before.y);
        }
      });

      it('positions disconnected nodes below connected graph after deletion', async () => {
        mockDeleteFeature.mockResolvedValue({ feature: { id: 'f1' } });

        let capturedState: ControlCenterState | null = null;

        render(
          <HookTestHarness
            initialNodes={[chainRepoNode, chainFeat1, chainFeat2] as CanvasNodeType[]}
            initialEdges={[chainEdgeRepoToFeat1, chainEdgeFeat1ToFeat2]}
            onStateChange={(state) => {
              capturedState = state;
            }}
          />
        );

        await act(async () => {
          capturedState!.handleDeleteFeature('feat-1');
        });

        // After deleting feat-1, feat-2 has no edges and becomes disconnected.
        // layoutWithDagre should place disconnected nodes below the connected graph.
        const repoAfter = capturedState!.nodes.find((n) => n.id === 'repo-1')!;
        const feat2After = capturedState!.nodes.find((n) => n.id === 'feat-2')!;

        // Repo node height is 50px. Disconnected feat-2 should be below repo's bottom edge.
        const repoBottom = repoAfter.position.y + 50;
        expect(feat2After.position.y).toBeGreaterThan(repoBottom);
      });

      it('preserves correct node and edge counts after relayout', async () => {
        mockDeleteFeature.mockResolvedValue({ feature: { id: 'f1' } });

        let capturedState: ControlCenterState | null = null;

        render(
          <HookTestHarness
            initialNodes={[chainRepoNode, chainFeat1, chainFeat2] as CanvasNodeType[]}
            initialEdges={[chainEdgeRepoToFeat1, chainEdgeFeat1ToFeat2]}
            onStateChange={(state) => {
              capturedState = state;
            }}
          />
        );

        // Before deletion: 3 nodes, 2 edges
        expect(capturedState!.nodes).toHaveLength(3);
        expect(capturedState!.edges).toHaveLength(2);

        await act(async () => {
          capturedState!.handleDeleteFeature('feat-1');
        });

        // After deletion: 2 nodes remain (repo-1 and feat-2)
        expect(capturedState!.nodes).toHaveLength(2);
        expect(capturedState!.nodes.map((n) => n.id).sort()).toEqual(['feat-2', 'repo-1']);

        // Both edges were connected to feat-1, so 0 edges remain
        expect(capturedState!.edges).toHaveLength(0);
      });
    });
  });

  describe('isRefreshBlocked suppresses background refresh', () => {
    it('polling does not call router.refresh() when isRefreshBlocked returns true', () => {
      vi.useFakeTimers();

      const isRefreshBlocked = vi.fn(() => true);
      render(
        <HookTestHarness
          initialNodes={[mockFeatureNode] as CanvasNodeType[]}
          initialEdges={[]}
          isRefreshBlocked={isRefreshBlocked}
        />
      );

      // mockFeatureNode has state 'running', so polling starts
      act(() => {
        vi.advanceTimersByTime(10_000);
      });

      expect(mockRefresh).not.toHaveBeenCalled();

      vi.useRealTimers();
    });

    it('polling calls router.refresh() when isRefreshBlocked returns false', () => {
      vi.useFakeTimers();

      const isRefreshBlocked = vi.fn(() => false);
      render(
        <HookTestHarness
          initialNodes={[mockFeatureNode] as CanvasNodeType[]}
          initialEdges={[]}
          isRefreshBlocked={isRefreshBlocked}
        />
      );

      act(() => {
        vi.advanceTimersByTime(5_000);
      });

      expect(mockRefresh).toHaveBeenCalled();

      vi.useRealTimers();
    });

    it('polling calls router.refresh() when isRefreshBlocked is not provided', () => {
      vi.useFakeTimers();

      render(
        <HookTestHarness initialNodes={[mockFeatureNode] as CanvasNodeType[]} initialEdges={[]} />
      );

      act(() => {
        vi.advanceTimersByTime(5_000);
      });

      expect(mockRefresh).toHaveBeenCalled();

      vi.useRealTimers();
    });
  });
});
