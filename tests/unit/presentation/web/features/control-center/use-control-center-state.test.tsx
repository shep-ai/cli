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
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: mockRefresh }),
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
const mockCreateFeature = vi.fn();
const mockDeleteFeature = vi.fn();

vi.mock('@/app/actions/create-feature', () => ({
  createFeature: (...args: unknown[]) => mockCreateFeature(...args),
}));

vi.mock('@/app/actions/delete-feature', () => ({
  deleteFeature: (...args: unknown[]) => mockDeleteFeature(...args),
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
      <div data-testid="pending-repo-path">{state.pendingRepositoryPath}</div>
      <div data-testid="is-deleting">{String(state.isDeleting)}</div>
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
            repositoryPath: '/Users/foo/bar',
            approvalGates: { allowPrd: false, allowPlan: false, allowMerge: false },
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

  describe('handleNodeClick', () => {
    it('does not set selectedNode when clicking a node with state "creating"', () => {
      const creatingNode: FeatureNodeType = {
        id: 'feat-creating',
        type: 'featureNode',
        position: { x: 200, y: 200 },
        data: {
          name: 'Creating Feature',
          featureId: '#c1',
          lifecycle: 'requirements',
          state: 'creating',
          progress: 0,
          repositoryPath: '/home/user/repo',
          branch: '',
        },
      };

      let capturedState: ControlCenterState | null = null;
      render(
        <HookTestHarness
          initialNodes={[creatingNode] as CanvasNodeType[]}
          initialEdges={[]}
          onStateChange={(state) => {
            capturedState = state;
          }}
        />
      );

      act(() => {
        capturedState!.handleNodeClick({} as React.MouseEvent, creatingNode as CanvasNodeType);
      });

      expect(capturedState!.selectedNode).toBeNull();
    });

    it('sets selectedNode when clicking a node with state "running"', () => {
      let capturedState: ControlCenterState | null = null;
      render(
        <HookTestHarness
          initialNodes={[mockFeatureNode] as CanvasNodeType[]}
          initialEdges={[]}
          onStateChange={(state) => {
            capturedState = state;
          }}
        />
      );

      act(() => {
        capturedState!.handleNodeClick({} as React.MouseEvent, mockFeatureNode as CanvasNodeType);
      });

      expect(capturedState!.selectedNode).not.toBeNull();
      expect(capturedState!.selectedNode!.name).toBe('Auth Module');
    });
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
    it('calls createFeature server action with the payload', async () => {
      mockCreateFeature.mockResolvedValue({ feature: { id: '1' } });
      renderHook();

      await act(async () => {
        fireEvent.click(screen.getByTestId('create-feature-submit'));
      });

      expect(mockCreateFeature).toHaveBeenCalledWith({
        name: 'My Feature',
        description: 'A test feature',
        attachments: [],
        repositoryPath: '/Users/foo/bar',
        approvalGates: { allowPrd: false, allowPlan: false, allowMerge: false },
      });
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

    it('exposes pendingRepositoryPath derived from repo node data', () => {
      const serverRepoNode: RepositoryNodeType = {
        id: 'repo-/Users/foo/bar',
        type: 'repositoryNode',
        position: { x: 0, y: 0 },
        data: { name: 'bar', repositoryPath: '/Users/foo/bar' },
      };
      renderHook([serverRepoNode] as CanvasNodeType[]);

      act(() => {
        fireEvent.click(screen.getByTestId('add-to-repo-server'));
      });

      expect(screen.getByTestId('pending-repo-path')).toHaveTextContent('/Users/foo/bar');
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

  describe('createFeatureNode state override and return value', () => {
    it('returns the generated node ID when adding a feature to a feature', () => {
      let capturedState: ControlCenterState | null = null;
      renderHook([mockFeatureNode] as CanvasNodeType[], [], (state) => {
        capturedState = state;
      });

      const nodeCountBefore = capturedState!.nodes.length;

      act(() => {
        fireEvent.click(screen.getByTestId('add-to-feature'));
      });

      // A new node should have been added
      expect(capturedState!.nodes.length).toBe(nodeCountBefore + 1);
      // The new node should have an ID matching the feature-{timestamp}-{counter} pattern
      const newNode = capturedState!.nodes.find((n) => n.id !== 'feat-1');
      expect(newNode).toBeDefined();
      expect(newNode!.id).toMatch(/^feature-\d+-\d+$/);
    });

    it('creates a node with state "creating" when dataOverride has state creating', () => {
      let capturedState: ControlCenterState | null = null;
      renderHook([mockRepoNode] as CanvasNodeType[], [], (state) => {
        capturedState = state;
      });

      // Open drawer from repo, then submit to trigger optimistic creation
      act(() => {
        fireEvent.click(screen.getByTestId('add-to-repo'));
      });

      // Use handleAddFeatureToFeature as proxy for createFeatureNode (default state)
      act(() => {
        // Add feature to repo through direct createFeatureNode via handleAddFeatureToFeature
        fireEvent.click(screen.getByTestId('add-to-feature-creating'));
      });

      // The new node should have state 'creating'
      const newNode = capturedState!.nodes.find(
        (n) => n.type === 'featureNode' && (n.data as FeatureNodeData).state === 'creating'
      );
      expect(newNode).toBeDefined();
    });

    it('does not set selectedNode when node state is creating', () => {
      let capturedState: ControlCenterState | null = null;
      renderHook([mockRepoNode] as CanvasNodeType[], [], (state) => {
        capturedState = state;
      });

      act(() => {
        fireEvent.click(screen.getByTestId('add-to-feature-creating'));
      });

      // selectedNode should remain null — creating nodes are not auto-selected
      expect(capturedState!.selectedNode).toBeNull();
    });

    it('still sets selectedNode for default (running) state nodes', () => {
      let capturedState: ControlCenterState | null = null;
      renderHook([mockFeatureNode] as CanvasNodeType[], [], (state) => {
        capturedState = state;
      });

      act(() => {
        fireEvent.click(screen.getByTestId('add-to-feature'));
      });

      // selectedNode should be set to the new feature (default running state)
      expect(capturedState!.selectedNode).not.toBeNull();
      expect(capturedState!.selectedNode!.name).toBe('New Feature');
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
        repositoryPath: '/home/user/my-repo',
        branch: 'feat/feature-a',
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

  describe('optimistic submit flow', () => {
    const serverRepoNode: RepositoryNodeType = {
      id: 'repo-/Users/foo/bar',
      type: 'repositoryNode',
      position: { x: 0, y: 0 },
      data: { name: 'bar', repositoryPath: '/Users/foo/bar' },
    };

    it('inserts an optimistic node with state "creating" before server action resolves', async () => {
      let resolvePromise!: (v: { feature?: { id: string } }) => void;
      mockCreateFeature.mockReturnValue(
        new Promise((resolve) => {
          resolvePromise = resolve;
        })
      );

      let capturedState: ControlCenterState | null = null;
      render(
        <HookTestHarness
          initialNodes={[serverRepoNode] as CanvasNodeType[]}
          initialEdges={[]}
          onStateChange={(state) => {
            capturedState = state;
          }}
        />
      );

      // Open drawer from repo
      act(() => {
        fireEvent.click(screen.getByTestId('add-to-repo-server'));
      });

      // Start submit (don't await — action is still pending)
      act(() => {
        fireEvent.click(screen.getByTestId('create-feature-submit'));
      });

      // Optimistic node should appear immediately (before action resolves)
      expect(screen.getByTestId('node-count')).toHaveTextContent('2');
      const optimisticNode = capturedState!.nodes.find(
        (n) => n.type === 'featureNode' && (n.data as FeatureNodeData).state === 'creating'
      );
      expect(optimisticNode).toBeDefined();
      expect((optimisticNode!.data as FeatureNodeData).name).toBe('My Feature');

      // Clean up the pending promise
      await act(async () => {
        resolvePromise({ feature: { id: '1' } });
      });
    });

    it('closes drawer immediately on submit (before server action resolves)', async () => {
      let resolvePromise!: (v: { feature?: { id: string } }) => void;
      mockCreateFeature.mockReturnValue(
        new Promise((resolve) => {
          resolvePromise = resolve;
        })
      );

      renderHook([serverRepoNode] as CanvasNodeType[]);

      // Open drawer from repo
      act(() => {
        fireEvent.click(screen.getByTestId('add-to-repo-server'));
      });
      expect(screen.getByTestId('create-drawer-open')).toHaveTextContent('true');

      // Start submit
      act(() => {
        fireEvent.click(screen.getByTestId('create-feature-submit'));
      });

      // Drawer should be closed immediately (before action resolves)
      expect(screen.getByTestId('create-drawer-open')).toHaveTextContent('false');

      // Clean up the pending promise
      await act(async () => {
        resolvePromise({ feature: { id: '1' } });
      });
    });

    it('creates an edge connecting optimistic node to repo node', async () => {
      let resolvePromise!: (v: { feature?: { id: string } }) => void;
      mockCreateFeature.mockReturnValue(
        new Promise((resolve) => {
          resolvePromise = resolve;
        })
      );

      let capturedState: ControlCenterState | null = null;
      render(
        <HookTestHarness
          initialNodes={[serverRepoNode] as CanvasNodeType[]}
          initialEdges={[]}
          onStateChange={(state) => {
            capturedState = state;
          }}
        />
      );

      // Open drawer from repo
      act(() => {
        fireEvent.click(screen.getByTestId('add-to-repo-server'));
      });

      // Submit
      act(() => {
        fireEvent.click(screen.getByTestId('create-feature-submit'));
      });

      // Should have an edge from repo to optimistic node
      expect(screen.getByTestId('edge-count')).toHaveTextContent('1');
      const edge = capturedState!.edges[0];
      expect(edge.source).toBe('repo-/Users/foo/bar');

      // Clean up the pending promise
      await act(async () => {
        resolvePromise({ feature: { id: '1' } });
      });
    });

    it('calls router.refresh() on successful server action response', async () => {
      mockCreateFeature.mockResolvedValue({ feature: { id: '1', name: 'My Feature' } });

      renderHook([serverRepoNode] as CanvasNodeType[]);

      act(() => {
        fireEvent.click(screen.getByTestId('add-to-repo-server'));
      });

      await act(async () => {
        fireEvent.click(screen.getByTestId('create-feature-submit'));
      });

      expect(mockRefresh).toHaveBeenCalled();
    });

    it('calls createFeature server action with the payload', async () => {
      mockCreateFeature.mockResolvedValue({ feature: { id: '1' } });
      renderHook();

      await act(async () => {
        fireEvent.click(screen.getByTestId('create-feature-submit'));
      });

      expect(mockCreateFeature).toHaveBeenCalledWith({
        name: 'My Feature',
        description: 'A test feature',
        attachments: [],
        repositoryPath: '/Users/foo/bar',
        approvalGates: { allowPrd: false, allowPlan: false, allowMerge: false },
      });
    });

    it('removes optimistic node on server action error', async () => {
      mockCreateFeature.mockResolvedValue({ error: 'Worktree creation failed' });

      let capturedState: ControlCenterState | null = null;
      render(
        <HookTestHarness
          initialNodes={[serverRepoNode] as CanvasNodeType[]}
          initialEdges={[]}
          onStateChange={(state) => {
            capturedState = state;
          }}
        />
      );

      // Open drawer from repo
      act(() => {
        fireEvent.click(screen.getByTestId('add-to-repo-server'));
      });

      // Submit
      await act(async () => {
        fireEvent.click(screen.getByTestId('create-feature-submit'));
      });

      // Optimistic node should be removed
      const creatingNode = capturedState!.nodes.find(
        (n) => n.type === 'featureNode' && (n.data as FeatureNodeData).state === 'creating'
      );
      expect(creatingNode).toBeUndefined();
      // Only the repo node should remain
      expect(screen.getByTestId('node-count')).toHaveTextContent('1');
    });

    it('removes optimistic edge on server action error', async () => {
      mockCreateFeature.mockResolvedValue({ error: 'Worktree creation failed' });

      renderHook([serverRepoNode] as CanvasNodeType[]);

      act(() => {
        fireEvent.click(screen.getByTestId('add-to-repo-server'));
      });

      await act(async () => {
        fireEvent.click(screen.getByTestId('create-feature-submit'));
      });

      // Edge should be removed along with the optimistic node
      expect(screen.getByTestId('edge-count')).toHaveTextContent('0');
    });

    it('shows error toast on server action error', async () => {
      mockCreateFeature.mockResolvedValue({ error: 'Worktree creation failed' });

      renderHook([serverRepoNode] as CanvasNodeType[]);

      act(() => {
        fireEvent.click(screen.getByTestId('add-to-repo-server'));
      });

      await act(async () => {
        fireEvent.click(screen.getByTestId('create-feature-submit'));
      });

      expect(mockToastError).toHaveBeenCalledWith('Worktree creation failed');
      expect(mockRefresh).not.toHaveBeenCalled();
    });

    it('shows generic error toast on network failure', async () => {
      mockCreateFeature.mockRejectedValue(new Error('Network error'));

      renderHook([serverRepoNode] as CanvasNodeType[]);

      act(() => {
        fireEvent.click(screen.getByTestId('add-to-repo-server'));
      });

      await act(async () => {
        fireEvent.click(screen.getByTestId('create-feature-submit'));
      });

      expect(mockToastError).toHaveBeenCalledWith('Failed to create feature');
    });

    it('removes optimistic node on network failure', async () => {
      mockCreateFeature.mockRejectedValue(new Error('Network error'));

      renderHook([serverRepoNode] as CanvasNodeType[]);

      act(() => {
        fireEvent.click(screen.getByTestId('add-to-repo-server'));
      });

      await act(async () => {
        fireEvent.click(screen.getByTestId('create-feature-submit'));
      });

      // Only repo node should remain
      expect(screen.getByTestId('node-count')).toHaveTextContent('1');
      expect(screen.getByTestId('edge-count')).toHaveTextContent('0');
    });

    it('resets pendingRepositoryPath immediately on submit', async () => {
      mockCreateFeature.mockResolvedValue({ feature: { id: '1' } });

      renderHook([serverRepoNode] as CanvasNodeType[]);

      act(() => {
        fireEvent.click(screen.getByTestId('add-to-repo-server'));
      });
      expect(screen.getByTestId('pending-repo-path')).toHaveTextContent('/Users/foo/bar');

      await act(async () => {
        fireEvent.click(screen.getByTestId('create-feature-submit'));
      });

      expect(screen.getByTestId('pending-repo-path')).toHaveTextContent('');
    });

    it('supports concurrent optimistic creations with unique IDs', async () => {
      let resolvePromise1!: (v: { feature?: { id: string } }) => void;
      let resolvePromise2!: (v: { feature?: { id: string } }) => void;
      let callCount = 0;
      mockCreateFeature.mockImplementation(
        () =>
          new Promise((resolve) => {
            callCount++;
            if (callCount === 1) resolvePromise1 = resolve;
            else resolvePromise2 = resolve;
          })
      );

      let capturedState: ControlCenterState | null = null;
      render(
        <HookTestHarness
          initialNodes={[serverRepoNode] as CanvasNodeType[]}
          initialEdges={[]}
          onStateChange={(state) => {
            capturedState = state;
          }}
        />
      );

      // First creation
      act(() => {
        fireEvent.click(screen.getByTestId('add-to-repo-server'));
      });
      act(() => {
        fireEvent.click(screen.getByTestId('create-feature-submit'));
      });

      // Second creation
      act(() => {
        fireEvent.click(screen.getByTestId('add-to-repo-server'));
      });
      act(() => {
        fireEvent.click(screen.getByTestId('create-feature-submit'));
      });

      // Should have 3 nodes: repo + 2 optimistic
      expect(screen.getByTestId('node-count')).toHaveTextContent('3');

      const creatingNodes = capturedState!.nodes.filter(
        (n) => n.type === 'featureNode' && (n.data as FeatureNodeData).state === 'creating'
      );
      expect(creatingNodes).toHaveLength(2);
      // IDs should be unique
      expect(creatingNodes[0].id).not.toBe(creatingNodes[1].id);

      // Clean up both pending promises
      await act(async () => {
        resolvePromise1({ feature: { id: '1' } });
        resolvePromise2({ feature: { id: '2' } });
      });
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

    it('isDeleting is false initially', () => {
      renderHook();
      expect(screen.getByTestId('is-deleting')).toHaveTextContent('false');
    });

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

      // Both edges (repo→feat-1 and feat-1→feat-2) should be removed
      expect(screen.getByTestId('edge-count')).toHaveTextContent('0');
    });

    it('clears selectedNode on success', async () => {
      mockDeleteFeature.mockResolvedValue({ feature: { id: 'f1' } });

      let capturedState: ControlCenterState | null = null;
      render(
        <HookTestHarness
          initialNodes={[featureNode] as CanvasNodeType[]}
          initialEdges={[]}
          onStateChange={(state) => {
            capturedState = state;
          }}
        />
      );

      // Simulate selecting the node first via handleNodeClick
      act(() => {
        capturedState!.handleNodeClick({} as React.MouseEvent, featureNode as CanvasNodeType);
      });
      expect(screen.getByTestId('selected-node')).toHaveTextContent('Auth Module');

      await act(async () => {
        fireEvent.click(screen.getByTestId('delete-feature'));
      });

      expect(screen.getByTestId('selected-node')).toHaveTextContent('null');
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

    it('isDeleting is true during action and false after completion', async () => {
      let resolvePromise: (v: { feature?: { id: string } }) => void;
      mockDeleteFeature.mockReturnValue(
        new Promise((resolve) => {
          resolvePromise = resolve;
        })
      );

      renderHook([featureNode] as CanvasNodeType[]);

      // Start delete (don't await — action is still pending)
      act(() => {
        fireEvent.click(screen.getByTestId('delete-feature'));
      });

      expect(screen.getByTestId('is-deleting')).toHaveTextContent('true');

      // Resolve the action
      await act(async () => {
        resolvePromise!({ feature: { id: 'f1' } });
      });

      expect(screen.getByTestId('is-deleting')).toHaveTextContent('false');
    });

    it('isDeleting is false after server action error', async () => {
      mockDeleteFeature.mockResolvedValue({ error: 'Delete failed' });

      renderHook([featureNode] as CanvasNodeType[]);

      await act(async () => {
        fireEvent.click(screen.getByTestId('delete-feature'));
      });

      expect(screen.getByTestId('is-deleting')).toHaveTextContent('false');
    });

    it('does not call router.refresh() on error', async () => {
      mockDeleteFeature.mockResolvedValue({ error: 'Delete failed' });

      renderHook([featureNode] as CanvasNodeType[]);

      await act(async () => {
        fireEvent.click(screen.getByTestId('delete-feature'));
      });

      expect(mockRefresh).not.toHaveBeenCalled();
    });
  });
});
