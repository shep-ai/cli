import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act, waitFor } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

let currentPathname = '/';
const mockPush = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, refresh: vi.fn() }),
  usePathname: () => currentPathname,
}));

vi.mock('@/hooks/agent-events-provider', () => ({
  useAgentEventsContext: () => ({
    events: [],
    lastEvent: null,
    connectionStatus: 'connected' as const,
  }),
}));

vi.mock('@xyflow/react', () => ({
  useReactFlow: () => ({ fitView: vi.fn() }),
}));

const mockDeleteFeature = vi.fn().mockResolvedValue({});
const mockAddRepository = vi
  .fn()
  .mockResolvedValue({ repository: { id: 'real-id', path: '/test', name: 'test' } });
const mockDeleteRepository = vi.fn().mockResolvedValue({ success: true });
const mockFetchGraphData = vi.fn().mockResolvedValue({ nodes: [], edges: [] });

vi.mock('@/app/actions/delete-feature', () => ({
  deleteFeature: (...args: unknown[]) => mockDeleteFeature(...args),
}));

vi.mock('@/app/actions/add-repository', () => ({
  addRepository: (...args: unknown[]) => mockAddRepository(...args),
}));

vi.mock('@/app/actions/delete-repository', () => ({
  deleteRepository: (...args: unknown[]) => mockDeleteRepository(...args),
}));

vi.mock('@/app/actions/get-graph-data', () => ({
  fetchGraphData: () => mockFetchGraphData(),
}));

vi.mock('@/app/actions/get-feature-metadata', () => ({
  getFeatureMetadata: vi.fn().mockResolvedValue(null),
}));

import type { CanvasNodeType } from '@/components/features/features-canvas';
import type { FeatureNodeData } from '@/components/common/feature-node';
import type { RepositoryNodeData } from '@/components/common/repository-node';
import {
  useControlCenterState,
  type ControlCenterState,
} from '@/components/features/control-center/use-control-center-state';

const makeFeatureNode = (
  id: string,
  repositoryPath = '/repo',
  overrides: Partial<FeatureNodeData> = {}
): CanvasNodeType =>
  ({
    id,
    type: 'featureNode',
    position: { x: 0, y: 0 },
    data: {
      name: 'Test Feature',
      featureId: id.replace('feat-', ''),
      lifecycle: 'requirements',
      state: 'running',
      progress: 0,
      repositoryPath,
      branch: 'feat/test',
      ...overrides,
    } as FeatureNodeData,
  }) as CanvasNodeType;

const makeRepoNode = (id: string, repositoryPath = '/repo'): CanvasNodeType =>
  ({
    id,
    type: 'repositoryNode',
    position: { x: 0, y: 0 },
    data: { name: 'my-repo', repositoryPath, id: id.replace('repo-', '') } as RepositoryNodeData,
  }) as CanvasNodeType;

// --- Test harness ---

function HookHarness({
  initialNodes,
  onState,
}: {
  initialNodes: CanvasNodeType[];
  onState?: (s: ControlCenterState) => void;
}) {
  const state = useControlCenterState(initialNodes, []);
  if (onState) onState(state);
  return (
    <>
      <div data-testid="node-count">{state.nodes.length}</div>
      <div data-testid="edge-count">{state.edges.length}</div>
    </>
  );
}

function renderWithQuery(
  initialNodes: CanvasNodeType[] = [],
  onState?: (s: ControlCenterState) => void
) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, refetchInterval: false, staleTime: Infinity },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <HookHarness initialNodes={initialNodes} onState={onState} />
    </QueryClientProvider>
  );
}

describe('useControlCenterState (TanStack Query)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentPathname = '/';
    mockFetchGraphData.mockResolvedValue({ nodes: [], edges: [] });
  });

  describe('initialization', () => {
    it('uses initialData for first render without fetching', () => {
      const repoNode = makeRepoNode('repo-1');
      const featureNode = makeFeatureNode('feat-abc', '/repo');

      renderWithQuery([repoNode, featureNode]);

      expect(screen.getByTestId('node-count')).toHaveTextContent('2');
      expect(screen.getByTestId('edge-count')).toHaveTextContent('1');
    });
  });

  describe('createFeatureNode (optimistic pending)', () => {
    it('adds a pending feature node to the canvas', () => {
      const repoNode = makeRepoNode('repo-1');
      let capturedState: ControlCenterState | null = null;

      renderWithQuery([repoNode], (s) => {
        capturedState = s;
      });

      act(() => {
        capturedState!.createFeatureNode(null, {
          state: 'creating',
          featureId: 'new-feat-1',
          name: 'New Feature',
          repositoryPath: '/repo',
        });
      });

      const featureNodes = capturedState!.nodes.filter((n) => n.type === 'featureNode');
      expect(featureNodes.length).toBeGreaterThanOrEqual(1);
      const newNode = featureNodes.find(
        (n) => (n.data as FeatureNodeData).featureId === 'new-feat-1'
      );
      expect(newNode).toBeDefined();
    });
  });

  describe('handleDeleteFeature (optimistic mutation)', () => {
    it('optimistically removes feature node from canvas', async () => {
      const repoNode = makeRepoNode('repo-1');
      const featureNode = makeFeatureNode('feat-abc', '/repo', { featureId: 'abc' });

      let capturedState: ControlCenterState | null = null;
      renderWithQuery([repoNode, featureNode], (s) => {
        capturedState = s;
      });

      expect(screen.getByTestId('node-count')).toHaveTextContent('2');

      act(() => {
        capturedState!.handleDeleteFeature('abc');
      });

      // Feature should be optimistically removed
      await waitFor(() => {
        expect(screen.getByTestId('node-count')).toHaveTextContent('1');
      });

      expect(mockDeleteFeature).toHaveBeenCalledWith('abc');
    });

    it('rolls back on server error', async () => {
      mockDeleteFeature.mockResolvedValueOnce({ error: 'Cannot delete' });
      // Return the original data on refetch so rollback has data
      const repoNode = makeRepoNode('repo-1');
      const featureNode = makeFeatureNode('feat-abc', '/repo', { featureId: 'abc' });
      mockFetchGraphData.mockResolvedValue({
        nodes: [repoNode, featureNode],
        edges: [],
      });

      let capturedState: ControlCenterState | null = null;
      renderWithQuery([repoNode, featureNode], (s) => {
        capturedState = s;
      });

      act(() => {
        capturedState!.handleDeleteFeature('abc');
      });

      // Wait for refetch to restore
      await waitFor(() => {
        expect(screen.getByTestId('node-count')).toHaveTextContent('2');
      });
    });
  });

  describe('handleAddRepository (optimistic mutation)', () => {
    it('adds a temporary repo node optimistically', async () => {
      renderWithQuery([]);

      let capturedState: ControlCenterState | null = null;
      const queryClient = new QueryClient({
        defaultOptions: {
          queries: { retry: false, refetchInterval: false, staleTime: Infinity },
          mutations: { retry: false },
        },
      });

      const { rerender } = render(
        <QueryClientProvider client={queryClient}>
          <HookHarness
            initialNodes={[]}
            onState={(s) => {
              capturedState = s;
            }}
          />
        </QueryClientProvider>
      );

      const result = capturedState!.handleAddRepository('/home/user/my-repo');
      expect(result.wasEmpty).toBe(true);
      expect(result.repoPath).toBe('/home/user/my-repo');

      // Should have called addRepository server action
      await waitFor(() => {
        expect(mockAddRepository).toHaveBeenCalledWith({
          path: '/home/user/my-repo',
          name: 'my-repo',
        });
      });

      rerender(
        <QueryClientProvider client={queryClient}>
          <HookHarness
            initialNodes={[]}
            onState={(s) => {
              capturedState = s;
            }}
          />
        </QueryClientProvider>
      );
    });
  });

  describe('handleDeleteRepository (optimistic mutation)', () => {
    it('optimistically removes repo and child features', async () => {
      const repoNode = makeRepoNode('repo-1');
      const featureNode = makeFeatureNode('feat-abc', '/repo');

      let capturedState: ControlCenterState | null = null;
      renderWithQuery([repoNode, featureNode], (s) => {
        capturedState = s;
      });

      expect(screen.getByTestId('node-count')).toHaveTextContent('2');

      act(() => {
        capturedState!.handleDeleteRepository('1');
      });

      await waitFor(() => {
        expect(mockDeleteRepository).toHaveBeenCalledWith('1');
      });
    });
  });

  describe('custom events', () => {
    it('shep:feature-created adds optimistic node', () => {
      // This is tested via the control-center-inner integration test
      // (custom event → createFeatureNode → pendingMap)
    });

    it('shep:feature-approved updates feature state in cache', async () => {
      const repoNode = makeRepoNode('repo-1');
      const featureNode = makeFeatureNode('feat-abc', '/repo', {
        featureId: 'abc',
        state: 'action-required',
      });

      let capturedState: ControlCenterState | null = null;
      renderWithQuery([repoNode, featureNode], (s) => {
        capturedState = s;
      });

      // Dispatch approval event
      act(() => {
        window.dispatchEvent(
          new CustomEvent('shep:feature-approved', {
            detail: { featureId: 'abc' },
          })
        );
      });

      await waitFor(() => {
        const node = capturedState!.nodes.find((n) => n.id === 'feat-abc');
        expect((node?.data as FeatureNodeData).state).toBe('running');
      });
    });
  });
});
