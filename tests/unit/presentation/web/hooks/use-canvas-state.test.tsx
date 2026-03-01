import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import type { Edge } from '@xyflow/react';
import type { FeatureNodeType, FeatureNodeData } from '@/components/common/feature-node';
import type { RepositoryNodeType } from '@/components/common/repository-node';
import type { AddRepositoryNodeType } from '@/components/common/add-repository-node';
import type { CanvasNodeType } from '@/components/features/features-canvas';

// --- Mocks ---

const mockRefresh = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: mockRefresh }),
}));

vi.mock('@/hooks/use-sound-action', () => ({
  useSoundAction: () => ({ play: vi.fn(), stop: vi.fn(), isPlaying: false }),
}));

import { useCanvasState, type UseCanvasStateResult } from '@/hooks/use-canvas-state';

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

const _mockAddRepoNode: AddRepositoryNodeType = {
  id: 'add-repo',
  type: 'addRepositoryNode',
  position: { x: 50, y: 50 },
  data: {},
};

/**
 * Test harness — renders the hook and exposes state via DOM.
 */
function HookTestHarness({
  initialNodes = [],
  initialEdges = [],
  onStateChange,
}: {
  initialNodes?: CanvasNodeType[];
  initialEdges?: Edge[];
  onStateChange?: (state: UseCanvasStateResult) => void;
}) {
  const state = useCanvasState({ initialNodes, initialEdges });

  if (onStateChange) {
    onStateChange(state);
  }

  return (
    <>
      <div data-testid="node-count">{state.nodes.length}</div>
      <div data-testid="edge-count">{state.edges.length}</div>
    </>
  );
}

function renderWithHarness(
  initialNodes: CanvasNodeType[] = [],
  initialEdges: Edge[] = [],
  onStateChange?: (state: UseCanvasStateResult) => void
) {
  return render(
    <HookTestHarness
      initialNodes={initialNodes}
      initialEdges={initialEdges}
      onStateChange={onStateChange}
    />
  );
}

describe('useCanvasState', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('initial nodes/edges match provided initialNodes/initialEdges', () => {
    const edge: Edge = { id: 'e1', source: 'repo-1', target: 'feat-1' };
    renderWithHarness([mockFeatureNode, mockRepoNode] as CanvasNodeType[], [edge]);

    expect(screen.getByTestId('node-count')).toHaveTextContent('2');
    expect(screen.getByTestId('edge-count')).toHaveTextContent('1');
  });

  describe('node sync effect', () => {
    it('merges server nodes with client positions on initialNodes change', () => {
      let _capturedState: UseCanvasStateResult | null = null;

      const { rerender } = render(
        <HookTestHarness
          initialNodes={[mockFeatureNode] as CanvasNodeType[]}
          initialEdges={[]}
          onStateChange={(state) => {
            _capturedState = state;
          }}
        />
      );

      expect(screen.getByTestId('node-count')).toHaveTextContent('1');

      const newFeature: FeatureNodeType = {
        id: 'feat-2',
        type: 'featureNode',
        position: { x: 200, y: 200 },
        data: {
          name: 'New Feature',
          featureId: '#f2',
          lifecycle: 'requirements',
          state: 'running',
          progress: 0,
          repositoryPath: '/home/user/repo',
          branch: 'feat/new',
        },
      };

      rerender(
        <HookTestHarness
          initialNodes={[mockFeatureNode, newFeature] as CanvasNodeType[]}
          initialEdges={[]}
          onStateChange={(state) => {
            _capturedState = state;
          }}
        />
      );

      expect(screen.getByTestId('node-count')).toHaveTextContent('2');
    });

    it('preserves optimistic creating nodes during server sync', () => {
      let capturedState: UseCanvasStateResult | null = null;

      const { rerender } = render(
        <HookTestHarness
          initialNodes={[mockRepoNode] as CanvasNodeType[]}
          initialEdges={[]}
          onStateChange={(state) => {
            capturedState = state;
          }}
        />
      );

      // Add optimistic node
      act(() => {
        capturedState!.createFeatureNode('repo-1', {
          state: 'creating',
          name: 'Optimistic Feature',
        });
      });

      expect(screen.getByTestId('node-count')).toHaveTextContent('2');

      // Simulate server refresh with a real feature
      const realFeature: FeatureNodeType = {
        id: 'feat-real-1',
        type: 'featureNode',
        position: { x: 300, y: 100 },
        data: {
          name: 'Optimistic Feature',
          featureId: '#r1',
          lifecycle: 'requirements',
          state: 'running',
          progress: 0,
          repositoryPath: '/home/user/repo',
          branch: 'feat/optimistic',
        },
      };

      rerender(
        <HookTestHarness
          initialNodes={[mockRepoNode, realFeature] as CanvasNodeType[]}
          initialEdges={[]}
          onStateChange={(state) => {
            capturedState = state;
          }}
        />
      );

      // Optimistic node should be gone, real feature in its place
      expect(screen.getByTestId('node-count')).toHaveTextContent('2');
      const creatingNode = capturedState!.nodes.find(
        (n) => n.type === 'featureNode' && (n.data as FeatureNodeData).state === 'creating'
      );
      expect(creatingNode).toBeUndefined();
    });
  });

  describe('handleConnect', () => {
    it('blocks duplicate repo-to-feature connections', () => {
      let capturedState: UseCanvasStateResult | null = null;
      const edge: Edge = { id: 'e1', source: 'repo-1', target: 'feat-1' };

      renderWithHarness([mockRepoNode, mockFeatureNode] as CanvasNodeType[], [edge], (state) => {
        capturedState = state;
      });

      // Attempt duplicate connection
      act(() => {
        capturedState!.handleConnect({
          source: 'repo-1',
          target: 'feat-1',
          sourceHandle: null,
          targetHandle: null,
        });
      });

      // Should still have 1 edge (duplicate blocked)
      expect(capturedState!.edges).toHaveLength(1);
    });
  });

  describe('createFeatureNode', () => {
    it('positions first child to the right of parent', () => {
      let capturedState: UseCanvasStateResult | null = null;
      renderWithHarness([mockFeatureNode] as CanvasNodeType[], [], (state) => {
        capturedState = state;
      });

      act(() => {
        capturedState!.createFeatureNode('feat-1');
      });

      const childNode = capturedState!.nodes.find(
        (n) => n.type === 'featureNode' && n.id !== 'feat-1'
      );
      expect(childNode).toBeDefined();
      // First child should be to the right (x + 488)
      expect(childNode!.position.x).toBe(mockFeatureNode.position.x + 488);
    });

    it('positions sibling below bottom-most', () => {
      let capturedState: UseCanvasStateResult | null = null;
      renderWithHarness([mockFeatureNode] as CanvasNodeType[], [], (state) => {
        capturedState = state;
      });

      // First child
      act(() => {
        capturedState!.createFeatureNode('feat-1');
      });
      const firstChildId = capturedState!.nodes.find(
        (n) => n.type === 'featureNode' && n.id !== 'feat-1'
      )!.id;

      // Second child (sibling)
      act(() => {
        capturedState!.createFeatureNode('feat-1');
      });

      const allChildren = capturedState!.nodes.filter(
        (n) => n.type === 'featureNode' && n.id !== 'feat-1'
      );
      expect(allChildren).toHaveLength(2);

      const firstChild = allChildren.find((n) => n.id === firstChildId)!;
      const secondChild = allChildren.find((n) => n.id !== firstChildId)!;
      expect(secondChild.position.y).toBeGreaterThan(firstChild.position.y);
    });
  });

  describe('polling fallback', () => {
    it('starts polling when active features exist', () => {
      renderWithHarness([mockFeatureNode] as CanvasNodeType[]);

      act(() => {
        vi.advanceTimersByTime(5000);
      });

      expect(mockRefresh).toHaveBeenCalled();
    });

    it('does not poll when no active features exist', () => {
      const doneFeature: FeatureNodeType = {
        ...mockFeatureNode,
        data: { ...mockFeatureNode.data, state: 'done' as const },
      };
      renderWithHarness([doneFeature] as CanvasNodeType[]);

      act(() => {
        vi.advanceTimersByTime(10000);
      });

      expect(mockRefresh).not.toHaveBeenCalled();
    });
  });

  describe('removeNode / removeEdge helpers', () => {
    it('removeNode removes a node by ID', () => {
      let capturedState: UseCanvasStateResult | null = null;
      renderWithHarness([mockRepoNode, mockFeatureNode] as CanvasNodeType[], [], (state) => {
        capturedState = state;
      });

      expect(screen.getByTestId('node-count')).toHaveTextContent('2');

      act(() => {
        capturedState!.removeNode('feat-1');
      });

      expect(screen.getByTestId('node-count')).toHaveTextContent('1');
    });

    it('removeEdge removes edges connected to a node', () => {
      const edge: Edge = { id: 'e1', source: 'repo-1', target: 'feat-1' };
      let capturedState: UseCanvasStateResult | null = null;

      renderWithHarness([mockRepoNode, mockFeatureNode] as CanvasNodeType[], [edge], (state) => {
        capturedState = state;
      });

      expect(screen.getByTestId('edge-count')).toHaveTextContent('1');

      act(() => {
        capturedState!.removeEdge('feat-1');
      });

      expect(screen.getByTestId('edge-count')).toHaveTextContent('0');
    });
  });
});
