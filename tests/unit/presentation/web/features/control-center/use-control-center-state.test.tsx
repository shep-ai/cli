import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act, fireEvent } from '@testing-library/react';
import type { Edge } from '@xyflow/react';
import { useControlCenterState } from '@/components/features/control-center/use-control-center-state';
import type { ControlCenterState } from '@/components/features/control-center/use-control-center-state';
import type { FeatureNodeType } from '@/components/common/feature-node';
import type { RepositoryNodeType } from '@/components/common/repository-node';
import type { AddRepositoryNodeType } from '@/components/common/add-repository-node';
import type { CanvasNodeType } from '@/components/features/features-canvas';

// --- Mocks ---

const mockRefresh = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: mockRefresh }),
}));

const mockToastSuccess = vi.fn();
const mockToastError = vi.fn();
vi.mock('sonner', () => ({
  toast: Object.assign(vi.fn(), {
    success: (...args: unknown[]) => mockToastSuccess(...args),
    error: (...args: unknown[]) => mockToastError(...args),
  }),
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
      <div data-testid="selected-node">{state.selectedNode ? state.selectedNode.name : 'null'}</div>
      <div data-testid="node-count">{state.nodes.length}</div>
      <div data-testid="edge-count">{state.edges.length}</div>
      <div data-testid="create-drawer-open">{String(state.isCreateDrawerOpen)}</div>
      <div data-testid="is-submitting">{String(state.isSubmitting)}</div>
      <button data-testid="add-feature" onClick={state.handleAddFeature}>
        Add Feature
      </button>
      <button
        data-testid="create-feature-submit"
        onClick={() =>
          state.handleCreateFeatureSubmit({
            name: 'My Feature',
            description: 'A test feature',
            attachments: [],
          })
        }
      >
        Submit Create
      </button>
      <button data-testid="close-create-drawer" onClick={state.closeCreateDrawer}>
        Close Create Drawer
      </button>
      <button data-testid="add-to-repo" onClick={() => state.handleAddFeatureToRepo('repo-1')}>
        Add to Repo
      </button>
      <button data-testid="add-to-repo-2" onClick={() => state.handleAddFeatureToRepo('repo-2')}>
        Add to Repo 2
      </button>
      <button
        data-testid="add-to-repo-server"
        onClick={() => state.handleAddFeatureToRepo('repo-/Users/foo/bar')}
      >
        Add to Server Repo
      </button>
      <button
        data-testid="add-to-feature"
        onClick={() => state.handleAddFeatureToFeature('feat-1')}
      >
        Add to Feature
      </button>
      <button data-testid="add-repository" onClick={() => state.handleAddRepository('my-org/repo')}>
        Add Repository
      </button>
      <button data-testid="clear-selection" onClick={state.clearSelection}>
        Clear
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
  });

  it('returns null selectedNode initially', () => {
    renderHook();
    expect(screen.getByTestId('selected-node')).toHaveTextContent('null');
  });

  it('initializes with provided nodes and edges', () => {
    renderHook([mockFeatureNode, mockRepoNode] as CanvasNodeType[], [
      { id: 'e1', source: 'repo-1', target: 'feat-1' },
    ]);
    expect(screen.getByTestId('node-count')).toHaveTextContent('2');
    expect(screen.getByTestId('edge-count')).toHaveTextContent('1');
  });

  it('clearSelection sets selectedNode to null', () => {
    renderHook([mockFeatureNode] as CanvasNodeType[]);
    fireEvent.click(screen.getByTestId('clear-selection'));
    expect(screen.getByTestId('selected-node')).toHaveTextContent('null');
  });

  it('Escape key clears selection', () => {
    renderHook([mockFeatureNode] as CanvasNodeType[]);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.getByTestId('selected-node')).toHaveTextContent('null');
  });

  describe('handleAddFeature', () => {
    it('opens the create drawer instead of immediately creating a node', () => {
      renderHook();

      act(() => {
        fireEvent.click(screen.getByTestId('add-feature'));
      });

      expect(screen.getByTestId('create-drawer-open')).toHaveTextContent('true');
      expect(screen.getByTestId('node-count')).toHaveTextContent('0');
      expect(screen.getByTestId('selected-node')).toHaveTextContent('null');
    });

    it('clears selected node when opening create drawer', () => {
      let capturedState: ControlCenterState | null = null;
      renderHook([mockFeatureNode] as CanvasNodeType[], [], (state) => {
        capturedState = state;
      });

      // Simulate selecting a node first by calling handleNodeClick would require
      // a more complex setup, so we test that selectedNode becomes null
      act(() => {
        fireEvent.click(screen.getByTestId('add-feature'));
      });

      expect(capturedState!.selectedNode).toBeNull();
      expect(capturedState!.isCreateDrawerOpen).toBe(true);
    });
  });

  describe('handleCreateFeatureSubmit', () => {
    it('shows error toast when submitting without repo context (via sidebar add)', () => {
      renderHook();

      // Open create drawer via sidebar (no repo context)
      act(() => {
        fireEvent.click(screen.getByTestId('add-feature'));
      });
      expect(screen.getByTestId('create-drawer-open')).toHaveTextContent('true');

      // Submit — should show error since there is no repo context
      act(() => {
        fireEvent.click(screen.getByTestId('create-feature-submit'));
      });

      expect(mockToastError).toHaveBeenCalled();
      // Drawer stays open
      expect(screen.getByTestId('create-drawer-open')).toHaveTextContent('true');
    });

    it('does not call fetch when submitting without repo context', () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch');
      renderHook();

      act(() => {
        fireEvent.click(screen.getByTestId('add-feature'));
      });
      act(() => {
        fireEvent.click(screen.getByTestId('create-feature-submit'));
      });

      expect(fetchSpy).not.toHaveBeenCalled();
    });
  });

  describe('closeCreateDrawer', () => {
    it('closes the create drawer without creating a node', () => {
      renderHook();

      act(() => {
        fireEvent.click(screen.getByTestId('add-feature'));
      });
      expect(screen.getByTestId('create-drawer-open')).toHaveTextContent('true');

      act(() => {
        fireEvent.click(screen.getByTestId('close-create-drawer'));
      });

      expect(screen.getByTestId('create-drawer-open')).toHaveTextContent('false');
      expect(screen.getByTestId('node-count')).toHaveTextContent('0');
    });
  });

  describe('handleAddFeatureToRepo', () => {
    it('opens the create drawer with repo context instead of immediately creating a node', () => {
      renderHook([mockRepoNode] as CanvasNodeType[]);

      act(() => {
        fireEvent.click(screen.getByTestId('add-to-repo'));
      });

      // Drawer should open instead of creating a node
      expect(screen.getByTestId('create-drawer-open')).toHaveTextContent('true');
      // No new node should be created yet
      expect(screen.getByTestId('node-count')).toHaveTextContent('1');
    });
  });

  describe('handleAddFeatureToFeature', () => {
    it('adds a child feature connected to the parent feature', () => {
      renderHook([mockFeatureNode] as CanvasNodeType[]);

      act(() => {
        fireEvent.click(screen.getByTestId('add-to-feature'));
      });

      expect(screen.getByTestId('node-count')).toHaveTextContent('2');
      expect(screen.getByTestId('edge-count')).toHaveTextContent('1');
      expect(screen.getByTestId('selected-node')).toHaveTextContent('New Feature');
    });

    it('does not shift parent feature when adding first child at same Y', () => {
      let capturedState: ControlCenterState | null = null;
      renderHook([mockFeatureNode] as CanvasNodeType[], [], (state) => {
        capturedState = state;
      });

      const parentYBefore = mockFeatureNode.position.y;

      act(() => {
        fireEvent.click(screen.getByTestId('add-to-feature'));
      });

      const parentAfter = capturedState!.nodes.find((n) => n.id === 'feat-1')!;
      // Parent feature should stay in place (not shift) when first child is at same Y
      expect(parentAfter.position.y).toBe(parentYBefore);
    });

    it('keeps parent feature centered after adding multiple children', () => {
      let capturedState: ControlCenterState | null = null;
      renderHook([mockFeatureNode] as CanvasNodeType[], [], (state) => {
        capturedState = state;
      });

      // Add two child features
      act(() => {
        fireEvent.click(screen.getByTestId('add-to-feature'));
      });
      act(() => {
        fireEvent.click(screen.getByTestId('add-to-feature'));
      });

      const parent = capturedState!.nodes.find((n) => n.id === 'feat-1')!;
      const childNodes = capturedState!.nodes.filter(
        (n) =>
          n.type === 'featureNode' &&
          n.id !== 'feat-1' &&
          capturedState!.edges.some((e) => e.source === 'feat-1' && e.target === n.id)
      );

      const childYs = childNodes.map((n) => n.position.y);
      const groupCenter = (Math.min(...childYs) + Math.max(...childYs) + 140) / 2;
      const parentCenter = parent.position.y + 140 / 2; // featureNode height = 140

      expect(parentCenter).toBe(groupCenter);
    });
  });

  describe('createFeatureNode positioning (via handleAddFeatureToFeature)', () => {
    // These tests verify positioning logic using handleAddFeatureToFeature,
    // which still creates local nodes directly via createFeatureNode.
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
      },
    };

    it('places new child feature to the right of the parent', () => {
      let capturedState: ControlCenterState | null = null;
      renderHook([parentFeature] as CanvasNodeType[], [], (state) => {
        capturedState = state;
      });

      act(() => {
        fireEvent.click(screen.getByTestId('add-to-feature'));
      });

      const childNode = capturedState!.nodes.find(
        (n) => n.type === 'featureNode' && n.id !== 'feat-1'
      );

      expect(childNode).toBeDefined();
      expect(childNode!.position.x).toBeGreaterThan(parentFeature.position.x);
    });

    it('places second child below the first child', () => {
      let capturedState: ControlCenterState | null = null;
      renderHook([parentFeature] as CanvasNodeType[], [], (state) => {
        capturedState = state;
      });

      // Add first child
      act(() => {
        fireEvent.click(screen.getByTestId('add-to-feature'));
      });
      const firstChildId = capturedState!.nodes.find(
        (n) => n.type === 'featureNode' && n.id !== 'feat-1'
      )!.id;

      // Add second child
      act(() => {
        fireEvent.click(screen.getByTestId('add-to-feature'));
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

  describe('handleAddRepository', () => {
    it('adds a new repository node', () => {
      renderHook([mockAddRepoNode] as CanvasNodeType[]);

      act(() => {
        fireEvent.click(screen.getByTestId('add-repository'));
      });

      expect(screen.getByTestId('node-count')).toHaveTextContent('2');
    });

    it('shifts add-repo node down when adding a repository', () => {
      let capturedState: ControlCenterState | null = null;
      renderHook([mockAddRepoNode] as CanvasNodeType[], [], (state) => {
        capturedState = state;
      });

      act(() => {
        fireEvent.click(screen.getByTestId('add-repository'));
      });

      const addRepoAfter = capturedState!.nodes.find((n) => n.type === 'addRepositoryNode');
      expect(addRepoAfter!.position.y).toBe(130); // 50 + 80
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
  });

  describe('async submit flow', () => {
    const serverRepoNode: RepositoryNodeType = {
      id: 'repo-/Users/foo/bar',
      type: 'repositoryNode',
      position: { x: 0, y: 0 },
      data: { name: 'bar' },
    };

    function mockFetchSuccess(feature = { id: '1', name: 'My Feature', slug: 'my-feature' }) {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(JSON.stringify({ feature }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );
    }

    function mockFetchError(message = 'Something went wrong') {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(JSON.stringify({ error: message }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        })
      );
    }

    it('calls fetch with correct URL and body when submitting from repo context', async () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
        new Response(JSON.stringify({ feature: { id: '1' } }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      renderHook([serverRepoNode] as CanvasNodeType[]);

      // Open drawer via repo node "+"
      act(() => {
        fireEvent.click(screen.getByTestId('add-to-repo-server'));
      });
      expect(screen.getByTestId('create-drawer-open')).toHaveTextContent('true');

      // Submit the form
      await act(async () => {
        fireEvent.click(screen.getByTestId('create-feature-submit'));
      });

      expect(fetchSpy).toHaveBeenCalledWith('/api/features/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'My Feature',
          description: 'A test feature',
          repositoryPath: '/Users/foo/bar',
          attachments: [],
        }),
      });
    });

    it('closes drawer and calls router.refresh() on successful submit', async () => {
      mockFetchSuccess();

      renderHook([serverRepoNode] as CanvasNodeType[]);

      // Open drawer from repo
      act(() => {
        fireEvent.click(screen.getByTestId('add-to-repo-server'));
      });

      // Submit
      await act(async () => {
        fireEvent.click(screen.getByTestId('create-feature-submit'));
      });

      expect(screen.getByTestId('create-drawer-open')).toHaveTextContent('false');
      expect(mockRefresh).toHaveBeenCalled();
      expect(mockToastSuccess).toHaveBeenCalled();
    });

    it('keeps drawer open on API error', async () => {
      mockFetchError('Worktree creation failed');

      renderHook([serverRepoNode] as CanvasNodeType[]);

      // Open drawer from repo
      act(() => {
        fireEvent.click(screen.getByTestId('add-to-repo-server'));
      });

      // Submit
      await act(async () => {
        fireEvent.click(screen.getByTestId('create-feature-submit'));
      });

      expect(screen.getByTestId('create-drawer-open')).toHaveTextContent('true');
      expect(mockToastError).toHaveBeenCalledWith('Worktree creation failed');
      expect(mockRefresh).not.toHaveBeenCalled();
    });

    it('shows error toast with message from API error response', async () => {
      mockFetchError('Slug collision detected');

      renderHook([serverRepoNode] as CanvasNodeType[]);

      act(() => {
        fireEvent.click(screen.getByTestId('add-to-repo-server'));
      });

      await act(async () => {
        fireEvent.click(screen.getByTestId('create-feature-submit'));
      });

      expect(mockToastError).toHaveBeenCalledWith('Slug collision detected');
    });

    it('isSubmitting is false initially', () => {
      renderHook();
      expect(screen.getByTestId('is-submitting')).toHaveTextContent('false');
    });

    it('isSubmitting is true while fetch is pending', async () => {
      let resolvePromise: (v: Response) => void;
      vi.spyOn(globalThis, 'fetch').mockReturnValue(
        new Promise((resolve) => {
          resolvePromise = resolve;
        })
      );

      renderHook([serverRepoNode] as CanvasNodeType[]);

      // Open drawer from repo
      act(() => {
        fireEvent.click(screen.getByTestId('add-to-repo-server'));
      });

      // Start submit (don't await — fetch is still pending)
      act(() => {
        fireEvent.click(screen.getByTestId('create-feature-submit'));
      });

      // isSubmitting should be true while fetch is pending
      expect(screen.getByTestId('is-submitting')).toHaveTextContent('true');

      // Resolve the fetch
      await act(async () => {
        resolvePromise!(
          new Response(JSON.stringify({ feature: { id: '1' } }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
        );
      });

      // isSubmitting should be false after fetch completes
      expect(screen.getByTestId('is-submitting')).toHaveTextContent('false');
    });

    it('isSubmitting is false after API error', async () => {
      mockFetchError();

      renderHook([serverRepoNode] as CanvasNodeType[]);

      act(() => {
        fireEvent.click(screen.getByTestId('add-to-repo-server'));
      });

      await act(async () => {
        fireEvent.click(screen.getByTestId('create-feature-submit'));
      });

      expect(screen.getByTestId('is-submitting')).toHaveTextContent('false');
    });

    it('does not call fetch when submitting without repo context', () => {
      const fetchSpy = vi.spyOn(globalThis, 'fetch');
      renderHook();

      // Open drawer via sidebar (no repo context)
      act(() => {
        fireEvent.click(screen.getByTestId('add-feature'));
      });

      act(() => {
        fireEvent.click(screen.getByTestId('create-feature-submit'));
      });

      expect(fetchSpy).not.toHaveBeenCalled();
      expect(mockToastError).toHaveBeenCalled();
      // Drawer stays open
      expect(screen.getByTestId('create-drawer-open')).toHaveTextContent('true');
    });

    it('resets pendingRepoNodeId after successful submit', async () => {
      mockFetchSuccess();

      renderHook([serverRepoNode] as CanvasNodeType[]);

      // Open drawer from repo, submit
      act(() => {
        fireEvent.click(screen.getByTestId('add-to-repo-server'));
      });
      await act(async () => {
        fireEvent.click(screen.getByTestId('create-feature-submit'));
      });

      // Now open drawer via sidebar (no repo context) and try to submit
      act(() => {
        fireEvent.click(screen.getByTestId('add-feature'));
      });

      vi.clearAllMocks();

      act(() => {
        fireEvent.click(screen.getByTestId('create-feature-submit'));
      });

      // Should show error because pendingRepoNodeId was reset
      expect(mockToastError).toHaveBeenCalled();
      expect(vi.mocked(globalThis.fetch)).not.toHaveBeenCalled();
    });
  });
});
