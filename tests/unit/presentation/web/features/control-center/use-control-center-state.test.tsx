import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { Edge } from '@xyflow/react';
import { useControlCenterState } from '@/components/features/control-center/use-control-center-state';
import {
  GRAPH_DATA_QUERY_KEY,
  type ControlCenterState,
  type GraphData,
} from '@/components/features/control-center/use-control-center-state';
import type { FeatureNodeType, FeatureNodeData } from '@/components/common/feature-node';
import type { RepositoryNodeType } from '@/components/common/repository-node';
import type { CanvasNodeType } from '@/components/features/features-canvas';
import React from 'react';

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

const mockFetchGraphData = vi.fn().mockResolvedValue({ nodes: [], edges: [] });
vi.mock('@/app/actions/get-graph-data', () => ({
  fetchGraphData: (...args: unknown[]) => mockFetchGraphData(...args),
}));

vi.mock('@/app/actions/get-feature-metadata', () => ({
  getFeatureMetadata: vi.fn().mockResolvedValue(null),
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
    repositoryPath: '/home/user/my-repo',
  },
};

function makeTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        refetchInterval: false,
        staleTime: Infinity,
      },
      mutations: { retry: false },
    },
  });
}

/**
 * Inner component that calls the hook. Must be inside QueryClientProvider.
 */
function HookTestHarnessInner({
  initialNodes = [],
  initialEdges = [],
  onStateChange,
}: {
  initialNodes?: CanvasNodeType[];
  initialEdges?: Edge[];
  onStateChange?: (state: ControlCenterState) => void;
}) {
  const state = useControlCenterState(initialNodes, initialEdges);

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
      <button data-testid="delete-feature" onClick={() => state.handleDeleteFeature('1')}>
        Delete Feature
      </button>
      <button
        data-testid="add-to-feature-creating"
        onClick={() =>
          state.createFeatureNode('repo-1', {
            state: 'creating',
            name: 'Optimistic Feature',
            repositoryPath: '/home/user/my-repo',
          })
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
  const queryClient = makeTestQueryClient();

  const result = render(
    <QueryClientProvider client={queryClient}>
      <HookTestHarnessInner
        initialNodes={initialNodes}
        initialEdges={initialEdges}
        onStateChange={onStateChange}
      />
    </QueryClientProvider>
  );

  return { ...result, queryClient };
}

describe('useControlCenterState', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
    // Default: addRepository resolves successfully
    mockAddRepository.mockResolvedValue({
      repository: { id: 'test-repo-id', name: 'repo', path: 'my-org/repo' },
    });
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
      renderHook([mockRepoNode, mockFeatureNode] as CanvasNodeType[], [], (state) => {
        capturedState = state;
      });

      const nodeCountBefore = capturedState!.nodes.length;

      act(() => {
        fireEvent.click(screen.getByTestId('add-to-feature-creating'));
      });

      expect(capturedState!.nodes.length).toBe(nodeCountBefore + 1);
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

      act(() => {
        capturedState!.createFeatureNode('feat-1');
      });
      const firstChildId = capturedState!.nodes.find(
        (n) => n.type === 'featureNode' && n.id !== 'feat-1'
      )!.id;

      act(() => {
        capturedState!.createFeatureNode('feat-1');
      });

      const allChildren = capturedState!.nodes.filter(
        (n) => n.type === 'featureNode' && n.id !== 'feat-1'
      );
      expect(allChildren).toHaveLength(2);

      const firstChild = allChildren.find((n) => n.id === firstChildId)!;
      const secondChild = allChildren.find((n) => n.id !== firstChildId)!;
      expect(secondChild.position.y).not.toBe(firstChild.position.y);
    });
  });

  describe('handleAddRepository', () => {
    it('adds a new repository node', async () => {
      renderHook([]);

      fireEvent.click(screen.getByTestId('add-repository'));

      await waitFor(() => {
        expect(screen.getByTestId('node-count')).toHaveTextContent('1');
      });
    });

    it('creates repo node with selected path as name', async () => {
      let capturedState: ControlCenterState | null = null;
      renderHook([], [], (state) => {
        capturedState = state;
      });

      fireEvent.click(screen.getByTestId('add-repository'));

      await waitFor(() => {
        const repoNode = capturedState!.nodes.find((n) => n.type === 'repositoryNode');
        expect(repoNode).toBeDefined();
        expect((repoNode!.data as { name: string }).name).toBe('repo');
      });
    });

    it('places new repo via dagre layout', async () => {
      let capturedState: ControlCenterState | null = null;
      renderHook([], [], (state) => {
        capturedState = state;
      });

      fireEvent.click(screen.getByTestId('add-repository'));

      await waitFor(() => {
        const repoNode = capturedState!.nodes.find((n) => n.type === 'repositoryNode');
        expect(repoNode).toBeDefined();
        expect(typeof repoNode!.position.x).toBe('number');
        expect(typeof repoNode!.position.y).toBe('number');
      });
    });

    it('stacks multiple repos without overlap via dagre layout', async () => {
      let repoCounter = 0;
      mockAddRepository
        .mockResolvedValueOnce({
          repository: { id: `repo-${++repoCounter}`, name: 'repo', path: 'my-org/repo' },
        })
        .mockResolvedValueOnce({
          repository: { id: `repo-${++repoCounter}`, name: 'repo', path: 'my-org/repo' },
        });

      let capturedState: ControlCenterState | null = null;
      renderHook([], [], (state) => {
        capturedState = state;
      });

      fireEvent.click(screen.getByTestId('add-repository'));

      await waitFor(() => {
        expect(capturedState!.nodes.filter((n) => n.type === 'repositoryNode')).toHaveLength(1);
      });

      fireEvent.click(screen.getByTestId('add-repository'));

      await waitFor(() => {
        const repoNodes = capturedState!.nodes.filter((n) => n.type === 'repositoryNode');
        expect(repoNodes).toHaveLength(2);
        expect(repoNodes[0].position.y).not.toBe(repoNodes[1].position.y);
      });
    });

    it('rolls back repo node on server action error', async () => {
      mockAddRepository.mockResolvedValue({ error: 'Repository already exists' });

      renderHook([]);

      await act(async () => {
        fireEvent.click(screen.getByTestId('add-repository'));
      });

      expect(screen.getByTestId('node-count')).toHaveTextContent('0');
    });

    it('rolls back repo node on network failure', async () => {
      mockAddRepository.mockRejectedValue(new Error('Network error'));

      renderHook([]);

      await act(async () => {
        fireEvent.click(screen.getByTestId('add-repository'));
      });

      expect(screen.getByTestId('node-count')).toHaveTextContent('0');
    });

    describe('first-repo metadata return value', () => {
      it('returns wasEmpty true when repoMap is empty', () => {
        let capturedState: ControlCenterState | null = null;
        renderHook([], [], (state) => {
          capturedState = state;
        });

        let result: { wasEmpty: boolean; repoPath: string } | undefined;
        act(() => {
          result = capturedState!.handleAddRepository('/home/user/first-repo');
        });

        expect(result).toBeDefined();
        expect(result!.wasEmpty).toBe(true);
      });

      it('returns wasEmpty false when repoMap has entries', () => {
        let capturedState: ControlCenterState | null = null;
        renderHook([mockRepoNode] as CanvasNodeType[], [], (state) => {
          capturedState = state;
        });

        let result: { wasEmpty: boolean; repoPath: string } | undefined;
        act(() => {
          result = capturedState!.handleAddRepository('/home/user/second-repo');
        });

        expect(result).toBeDefined();
        expect(result!.wasEmpty).toBe(false);
      });

      it('returns the correct repoPath', () => {
        let capturedState: ControlCenterState | null = null;
        renderHook([], [], (state) => {
          capturedState = state;
        });

        let result: { wasEmpty: boolean; repoPath: string } | undefined;
        act(() => {
          result = capturedState!.handleAddRepository('/home/user/my-project');
        });

        expect(result).toBeDefined();
        expect(result!.repoPath).toBe('/home/user/my-project');
      });

      it('returns wasEmpty false after a repo has already been added', async () => {
        mockAddRepository.mockResolvedValueOnce({
          repository: { id: 'first-repo-id', name: 'first-repo', path: '/home/user/first-repo' },
        });

        let capturedState: ControlCenterState | null = null;
        renderHook([], [], (state) => {
          capturedState = state;
        });

        // First add — should be empty
        const firstResult = capturedState!.handleAddRepository('/home/user/first-repo');
        expect(firstResult.wasEmpty).toBe(true);

        // Wait for mutation to complete so repoMap is updated
        await waitFor(() => {
          expect(capturedState!.nodes.filter((n) => n.type === 'repositoryNode')).toHaveLength(1);
        });

        // Second add — repoMap now has first repo, so wasEmpty = false
        const secondResult = capturedState!.handleAddRepository('/home/user/second-repo');
        expect(secondResult!.wasEmpty).toBe(false);
      });
    });
  });

  describe('fast-mode feature handling', () => {
    it('creates optimistic feature node with real featureId when provided', () => {
      let capturedState: ControlCenterState | null = null;
      renderHook([mockRepoNode] as CanvasNodeType[], [], (state) => {
        capturedState = state;
      });

      act(() => {
        capturedState!.createFeatureNode('repo-1', {
          state: 'creating',
          featureId: 'fast-feat-123',
          name: 'Fast Feature',
          repositoryPath: '/home/user/my-repo',
        });
      });

      const newNode = capturedState!.nodes.find(
        (n) => n.type === 'featureNode' && (n.data as FeatureNodeData).featureId === 'fast-feat-123'
      );
      expect(newNode).toBeDefined();
      expect(newNode!.id).toBe('feat-fast-feat-123');
    });

    it('feature starting at Implementation lifecycle renders correctly after query cache update', async () => {
      let capturedState: ControlCenterState | null = null;

      const { queryClient } = renderHook([mockRepoNode] as CanvasNodeType[], [], (state) => {
        capturedState = state;
      });

      const fastFeature: FeatureNodeType = {
        id: 'feat-fast-1',
        type: 'featureNode',
        position: { x: 400, y: 100 },
        data: {
          name: 'Quick Fix',
          featureId: 'fast-1',
          lifecycle: 'implementation',
          state: 'running',
          progress: 0,
          repositoryPath: '/home/user/my-repo',
          branch: 'feat/quick-fix',
        },
      };

      queryClient.setQueryData<GraphData>(GRAPH_DATA_QUERY_KEY, {
        nodes: [mockRepoNode as CanvasNodeType, fastFeature as CanvasNodeType],
        edges: [],
      });

      await waitFor(() => {
        const fastNode = capturedState!.nodes.find((n) => n.id === 'feat-fast-1');
        expect(fastNode).toBeDefined();
        expect((fastNode!.data as FeatureNodeData).lifecycle).toBe('implementation');
        expect((fastNode!.data as FeatureNodeData).state).toBe('running');
      });
    });
  });

  describe('query cache data sync (replaces initialNodes prop sync)', () => {
    it('updates nodes when query cache changes (simulates server refetch)', async () => {
      const { queryClient } = renderHook([mockRepoNode, mockFeatureNode] as CanvasNodeType[], []);

      expect(screen.getByTestId('node-count')).toHaveTextContent('2');

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
          repositoryPath: '/home/user/my-repo',
          branch: 'feat/new',
        },
      };

      queryClient.setQueryData<GraphData>(GRAPH_DATA_QUERY_KEY, {
        nodes: [
          mockRepoNode as CanvasNodeType,
          mockFeatureNode as CanvasNodeType,
          newFeatureNode as CanvasNodeType,
        ],
        edges: [],
      });

      await waitFor(() => {
        expect(screen.getByTestId('node-count')).toHaveTextContent('3');
      });
    });

    it('derives edges when query cache adds feature with matching repositoryPath', async () => {
      const { queryClient } = renderHook([mockRepoNode] as CanvasNodeType[], []);

      expect(screen.getByTestId('edge-count')).toHaveTextContent('0');

      queryClient.setQueryData<GraphData>(GRAPH_DATA_QUERY_KEY, {
        nodes: [mockRepoNode as CanvasNodeType, mockFeatureNode as CanvasNodeType],
        edges: [],
      });

      await waitFor(() => {
        expect(screen.getByTestId('edge-count')).toHaveTextContent('1');
      });
    });

    it('replaces optimistic node when query cache returns real feature', async () => {
      let capturedState: ControlCenterState | null = null;

      const { queryClient } = renderHook([mockRepoNode] as CanvasNodeType[], [], (state) => {
        capturedState = state;
      });

      act(() => {
        capturedState!.createFeatureNode('repo-1', {
          state: 'creating',
          name: 'My Optimistic Feature',
          repositoryPath: '/home/user/my-repo',
        });
      });

      expect(screen.getByTestId('node-count')).toHaveTextContent('2');

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
          repositoryPath: '/home/user/my-repo',
          branch: 'feat/optimistic',
        },
      };

      queryClient.setQueryData<GraphData>(GRAPH_DATA_QUERY_KEY, {
        nodes: [mockRepoNode as CanvasNodeType, realFeature as CanvasNodeType],
        edges: [],
      });

      await waitFor(() => {
        expect(screen.getByTestId('node-count')).toHaveTextContent('2');
        const optimisticNode = capturedState!.nodes.find(
          (n) => n.type === 'featureNode' && (n.data as FeatureNodeData).state === 'creating'
        );
        expect(optimisticNode).toBeUndefined();

        const realNode = capturedState!.nodes.find((n) => n.id === 'feat-real-123');
        expect(realNode).toBeDefined();
      });
    });

    it('does not duplicate nodes when query cache data has same IDs', async () => {
      const { queryClient } = renderHook([mockRepoNode, mockFeatureNode] as CanvasNodeType[], []);

      expect(screen.getByTestId('node-count')).toHaveTextContent('2');

      queryClient.setQueryData<GraphData>(GRAPH_DATA_QUERY_KEY, {
        nodes: [mockRepoNode as CanvasNodeType, mockFeatureNode as CanvasNodeType],
        edges: [],
      });

      await waitFor(() => {
        expect(screen.getByTestId('node-count')).toHaveTextContent('2');
      });
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
      data: { name: 'shep-ai/cli', repositoryPath: '/home/user/my-repo' },
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

      expect(mockDeleteFeature).toHaveBeenCalledWith('1');
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
      await waitFor(() => {
        expect(screen.getByTestId('node-count')).toHaveTextContent('2');
      });
    });

    it('removes edges connected to deleted node on success', async () => {
      mockDeleteFeature.mockResolvedValue({ feature: { id: 'f1' } });

      renderHook([featureNode, featureNode2, repoNode] as CanvasNodeType[], [
        edgeRepoToFeat1,
        edgeFeat1ToFeat2,
      ]);

      // Edges are derived from repositoryPath: repo→feat-1 and repo→feat-2 = 2
      expect(screen.getByTestId('edge-count')).toHaveTextContent('2');

      await act(async () => {
        fireEvent.click(screen.getByTestId('delete-feature'));
      });

      // After deleting feat-1, repo→feat-2 remains (derived from repositoryPath)
      await waitFor(() => {
        expect(screen.getByTestId('edge-count')).toHaveTextContent('1');
      });
    });

    it('shows success toast on successful deletion', async () => {
      mockDeleteFeature.mockResolvedValue({ feature: { id: 'f1' } });

      renderHook([featureNode] as CanvasNodeType[]);

      await act(async () => {
        fireEvent.click(screen.getByTestId('delete-feature'));
      });

      expect(mockToastSuccess).toHaveBeenCalled();
    });

    it('navigates to root on successful deletion', async () => {
      mockDeleteFeature.mockResolvedValue({ feature: { id: 'f1' } });

      renderHook([featureNode] as CanvasNodeType[]);

      await act(async () => {
        fireEvent.click(screen.getByTestId('delete-feature'));
      });

      expect(mockPush).toHaveBeenCalledWith('/');
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
        data: { name: 'shep-ai/cli', repositoryPath: '/home/user/my-repo' },
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

        renderHook(
          [chainRepoNode, chainFeat1, chainFeat2] as CanvasNodeType[],
          [chainEdgeRepoToFeat1, chainEdgeFeat1ToFeat2],
          (state) => {
            capturedState = state;
          }
        );

        for (const node of capturedState!.nodes) {
          positionsBefore.set(node.id, { ...node.position });
        }

        await act(async () => {
          capturedState!.handleDeleteFeature('1');
        });

        const repoAfter = capturedState!.nodes.find((n) => n.id === 'repo-1')!;
        const feat2After = capturedState!.nodes.find((n) => n.id === 'feat-2')!;

        const repoPosBefore = positionsBefore.get('repo-1')!;
        const feat2PosBefore = positionsBefore.get('feat-2')!;

        const repoMoved =
          repoAfter.position.x !== repoPosBefore.x || repoAfter.position.y !== repoPosBefore.y;
        const feat2Moved =
          feat2After.position.x !== feat2PosBefore.x || feat2After.position.y !== feat2PosBefore.y;

        expect(repoMoved || feat2Moved).toBe(true);
      });

      it('restores all nodes and edges on server action error', async () => {
        mockDeleteFeature.mockResolvedValue({ error: 'Delete failed' });

        let capturedState: ControlCenterState | null = null;

        renderHook(
          [chainRepoNode, chainFeat1, chainFeat2] as CanvasNodeType[],
          [chainEdgeRepoToFeat1, chainEdgeFeat1ToFeat2],
          (state) => {
            capturedState = state;
          }
        );

        await act(async () => {
          capturedState!.handleDeleteFeature('1');
        });

        expect(capturedState!.nodes).toHaveLength(3);
        expect(capturedState!.nodes.map((n) => n.id).sort()).toEqual([
          'feat-1',
          'feat-2',
          'repo-1',
        ]);
        expect(capturedState!.edges).toHaveLength(2);
      });

      it('remaining connected nodes are properly laid out after deletion', async () => {
        mockDeleteFeature.mockResolvedValue({ feature: { id: 'f1' } });

        let capturedState: ControlCenterState | null = null;

        renderHook(
          [chainRepoNode, chainFeat1, chainFeat2] as CanvasNodeType[],
          [chainEdgeRepoToFeat1, chainEdgeFeat1ToFeat2],
          (state) => {
            capturedState = state;
          }
        );

        await act(async () => {
          capturedState!.handleDeleteFeature('1');
        });

        await waitFor(() => {
          expect(capturedState!.nodes).toHaveLength(2);
        });

        const repoAfter = capturedState!.nodes.find((n) => n.id === 'repo-1')!;
        const feat2After = capturedState!.nodes.find((n) => n.id === 'feat-2')!;

        expect(repoAfter).toBeDefined();
        expect(feat2After).toBeDefined();
        expect(capturedState!.edges).toHaveLength(1);
        expect(typeof repoAfter.position.x).toBe('number');
        expect(typeof feat2After.position.x).toBe('number');
      });

      it('preserves correct node and edge counts after relayout', async () => {
        mockDeleteFeature.mockResolvedValue({ feature: { id: 'f1' } });

        let capturedState: ControlCenterState | null = null;

        renderHook(
          [chainRepoNode, chainFeat1, chainFeat2] as CanvasNodeType[],
          [chainEdgeRepoToFeat1, chainEdgeFeat1ToFeat2],
          (state) => {
            capturedState = state;
          }
        );

        expect(capturedState!.nodes).toHaveLength(3);
        expect(capturedState!.edges).toHaveLength(2);

        await act(async () => {
          capturedState!.handleDeleteFeature('1');
        });

        await waitFor(() => {
          expect(capturedState!.nodes).toHaveLength(2);
        });
        expect(capturedState!.nodes.map((n) => n.id).sort()).toEqual(['feat-2', 'repo-1']);
        expect(capturedState!.edges).toHaveLength(1);
      });
    });
  });
});
