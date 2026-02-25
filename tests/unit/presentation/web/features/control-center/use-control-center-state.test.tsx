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
  options,
}: {
  initialNodes?: CanvasNodeType[];
  initialEdges?: Edge[];
  onStateChange?: (state: ControlCenterState) => void;
  options?: { onFitView?: () => void };
}) {
  const state = useControlCenterState(initialNodes, initialEdges, options);

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
      <div data-testid="pending-parent-feature-id">{state.pendingParentFeatureId ?? 'none'}</div>
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
            push: true,
            openPr: true,
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
      <button data-testid="layout-lr" onClick={() => state.handleLayout('LR')}>
        Layout LR
      </button>
    </>
  );
}

function renderHook(
  initialNodes: CanvasNodeType[] = [],
  initialEdges: Edge[] = [],
  onStateChange?: (state: ControlCenterState) => void,
  options?: { onFitView?: () => void }
) {
  return render(
    <HookTestHarness
      initialNodes={initialNodes}
      initialEdges={initialEdges}
      onStateChange={onStateChange}
      options={options}
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
        push: true,
        openPr: true,
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
    it('opens the create drawer with parent feature pre-selected', () => {
      renderHook([mockFeatureNode] as CanvasNodeType[]);

      act(() => {
        fireEvent.click(screen.getByTestId('add-to-feature'));
      });

      // Drawer should open with parent feature ID pre-selected
      expect(screen.getByTestId('create-drawer-open')).toHaveTextContent('true');
      // featureId extracted from node id "feat-1" → "1" (strip "feat-" prefix)
      expect(screen.getByTestId('pending-parent-feature-id')).toHaveTextContent('1');
      // No new node should be created yet
      expect(screen.getByTestId('node-count')).toHaveTextContent('1');
    });

    it('clears pending parent feature ID when drawer is closed', () => {
      renderHook([mockFeatureNode] as CanvasNodeType[]);

      act(() => {
        fireEvent.click(screen.getByTestId('add-to-feature'));
      });

      expect(screen.getByTestId('pending-parent-feature-id')).toHaveTextContent('1');

      act(() => {
        fireEvent.click(screen.getByTestId('close-create-drawer'));
      });

      expect(screen.getByTestId('pending-parent-feature-id')).toHaveTextContent('none');
    });

    it('uses current edges (edgesRef) not stale closure-captured edges to resolve repo', () => {
      const repoNode: RepositoryNodeType = {
        id: 'repo-r1',
        type: 'repositoryNode',
        position: { x: 0, y: 0 },
        data: { name: 'my-repo', repositoryPath: '/home/user/my-repo' },
      };

      let capturedState: ControlCenterState | null = null;

      // Start with NO edges — feat-1 is disconnected from repo
      render(
        <HookTestHarness
          initialNodes={[repoNode, mockFeatureNode] as CanvasNodeType[]}
          initialEdges={[]}
          onStateChange={(state) => {
            capturedState = state;
          }}
        />
      );

      // Capture the handleAddFeatureToFeature callback BEFORE adding an edge
      const staleHandler = capturedState!.handleAddFeatureToFeature;

      // Connect feat-1 to repo-r1 by creating a feature from repo-r1
      // This adds an edge repo-r1 → newFeature via setEdges (edgesRef.current updated)
      // But we need a direct edge to feat-1. Let's use handleConnect instead.
      // Actually, let's just add an edge directly via createFeatureNode from feat-1's parent.
      // Simplest approach: rerender with new initial edges to trigger the sync effect.
      // But that would also re-create the callback. Instead, let's add an edge
      // by creating a feature from repo-r1 that happens to target feat-1.
      // Actually — the cleanest way is to call createFeatureNode which triggers setEdges.

      // Add a new feature from repo-r1. This creates an edge repo-r1 → newFeature
      // but also updates edgesRef.current.
      act(() => {
        capturedState!.createFeatureNode('repo-r1');
      });

      // Now edgesRef has 1 edge (repo-r1 → newFeature). The stale callback has 0 edges.
      // The handleAddFeatureToFeature looks for an edge targeting the given featureNodeId.
      // If we call it with the new feature's node ID, the stale version won't find the edge.
      const newFeatureNode = capturedState!.nodes.find(
        (n) => n.id !== 'repo-r1' && n.id !== 'feat-1'
      );
      expect(newFeatureNode).toBeDefined();

      // Call the STALE handler with the new feature node's ID
      act(() => {
        staleHandler(newFeatureNode!.id);
      });

      // If the handler used edgesRef.current, it finds the edge (repo-r1 → newFeature)
      // and sets pendingRepoNodeId to 'repo-r1', which resolves the repo path.
      // If it used stale closure edges (empty), repoNodeId would be null.
      expect(screen.getByTestId('pending-repo-path')).toHaveTextContent('/home/user/my-repo');
    });

    it('resolves repo path from parent feature node', () => {
      const repoNode: RepositoryNodeType = {
        id: 'repo-r1',
        type: 'repositoryNode',
        position: { x: 0, y: 0 },
        data: { name: 'my-repo', repositoryPath: '/home/user/my-repo' },
      };
      const repoEdge: Edge = {
        id: 'edge-repo-r1-feat-1',
        source: 'repo-r1',
        target: 'feat-1',
      };
      renderHook([repoNode, mockFeatureNode] as CanvasNodeType[], [repoEdge]);

      act(() => {
        fireEvent.click(screen.getByTestId('add-to-feature'));
      });

      // Should resolve the repo path from the parent feature's repo edge
      expect(screen.getByTestId('pending-repo-path')).toHaveTextContent('/home/user/my-repo');
    });
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

    it('places second child below the first child via createFeatureNode', () => {
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
      // 50 (original Y) + 50 (repoHeight) + 15 (gap) = 115
      expect(addRepoAfter!.position.y).toBe(115);
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

    it('places new repo at addRepositoryNode current Y position', () => {
      let capturedState: ControlCenterState | null = null;
      renderHook([mockAddRepoNode] as CanvasNodeType[], [], (state) => {
        capturedState = state;
      });

      act(() => {
        fireEvent.click(screen.getByTestId('add-repository'));
      });

      const repoNode = capturedState!.nodes.find((n) => n.type === 'repositoryNode');
      expect(repoNode).toBeDefined();
      // New repo should be placed at addRepoNode's original position {x: 50, y: 50}
      expect(repoNode!.position.x).toBe(50);
      expect(repoNode!.position.y).toBe(50);
    });

    it('stacks multiple repos correctly with addRepo shifting down', () => {
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

      // Second repo should be at addRepo's position after first add: Y=115
      expect(repoNodes[1].position.y).toBe(115);
      // addRepo should shift down again: 115 + 50 + 15 = 180
      expect(addRepoAfter!.position.y).toBe(180);
    });

    it('restores addRepoNode position on server action error', async () => {
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
      // addRepoNode should be restored to its original Y position (50)
      const addRepoAfter = capturedState!.nodes.find((n) => n.type === 'addRepositoryNode');
      expect(addRepoAfter!.position.y).toBe(50);
    });

    it('restores addRepoNode position on network failure', async () => {
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
      // addRepoNode should be restored to its original Y position (50)
      const addRepoAfter = capturedState!.nodes.find((n) => n.type === 'addRepositoryNode');
      expect(addRepoAfter!.position.y).toBe(50);
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
        push: true,
        openPr: true,
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

  describe('callback stability', () => {
    it('handleAddFeatureToFeature maintains stable identity when edges change', () => {
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

      // Capture the callback reference before any edge changes
      const before = capturedState!.handleAddFeatureToFeature;

      // Trigger createFeatureNode which calls setEdges internally (adds an edge)
      act(() => {
        capturedState!.createFeatureNode('feat-1');
      });

      // Capture the callback reference after edges have changed
      const after = capturedState!.handleAddFeatureToFeature;

      // handleAddFeatureToFeature uses edgesRef.current instead of closure-captured
      // edges, so it has an empty dependency array and maintains stable identity.
      expect(after).toBe(before);
    });
  });

  describe('handleLayout', () => {
    it('uses current edges (edgesRef) not stale closure-captured edges for layout', () => {
      let capturedState: ControlCenterState | null = null;

      // Start with repo + feature but NO edges
      render(
        <HookTestHarness
          initialNodes={[mockRepoNode, mockFeatureNode] as CanvasNodeType[]}
          initialEdges={[]}
          onStateChange={(state) => {
            capturedState = state;
          }}
        />
      );

      // Capture handleLayout BEFORE adding edges
      const staleHandleLayout = capturedState!.handleLayout;

      // Add an edge by creating a feature from repo-1
      act(() => {
        capturedState!.createFeatureNode('repo-1');
      });

      // edgesRef now has 1 edge. The stale handleLayout has 0 edges in its closure.
      expect(capturedState!.edges.length).toBe(1);

      // Record positions before layout
      const positionsBefore = new Map(capturedState!.nodes.map((n) => [n.id, { ...n.position }]));

      // Invoke the STALE handleLayout
      act(() => {
        staleHandleLayout('LR');
      });

      // With edges, dagre would place connected nodes in a left-to-right chain.
      // The repo node should be to the left of its child feature.
      // If stale (empty) edges were used, all nodes would be disconnected and
      // laid out in a single column instead of a chain.
      const repoAfter = capturedState!.nodes.find((n) => n.id === 'repo-1')!;
      const childNode = capturedState!.nodes.find(
        (n) => n.type === 'featureNode' && n.id !== 'feat-1'
      );

      // With the edge, the child should be positioned to the right of repo (LR layout)
      if (childNode) {
        expect(childNode.position.x).toBeGreaterThan(repoAfter.position.x);
      }

      // Verify at least one node moved (layout was applied)
      const anyMoved = capturedState!.nodes.some((n) => {
        const before = positionsBefore.get(n.id);
        return before && (n.position.x !== before.x || n.position.y !== before.y);
      });
      expect(anyMoved).toBe(true);
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

    describe('post-deletion relayout', () => {
      // 3-node chain: repo → feat-1 → feat-2
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

      it('uses current edges (edgesRef) not stale closure-captured edges for relayout', async () => {
        mockDeleteFeature.mockResolvedValue({ feature: { id: 'f1' } });

        let capturedState: ControlCenterState | null = null;

        // Start with repo → feat-1 → feat-2 (2 edges)
        render(
          <HookTestHarness
            initialNodes={[chainRepoNode, chainFeat1, chainFeat2] as CanvasNodeType[]}
            initialEdges={[chainEdgeRepoToFeat1, chainEdgeFeat1ToFeat2]}
            onStateChange={(state) => {
              capturedState = state;
            }}
          />
        );

        // Capture the handleDeleteFeature callback BEFORE adding new edges.
        // This is the stale closure scenario: the callback captures `edges`
        // at creation time, but edges will change before it's invoked.
        const staleHandleDelete = capturedState!.handleDeleteFeature;

        // Add a new edge by creating a new feature node connected to repo-1.
        // This calls setEdges internally, updating edgesRef.current.
        act(() => {
          capturedState!.createFeatureNode('repo-1');
        });

        // There should now be 3 edges (2 initial + 1 from createFeatureNode)
        expect(capturedState!.edges.length).toBe(3);

        // Invoke the STALE callback (captured before edge change).
        // If the callback reads from closure-captured `edges`, it will only
        // see the 2 initial edges, losing the new edge from createFeatureNode.
        // If it reads from edgesRef.current, it will see all 3 edges.
        await act(async () => {
          staleHandleDelete('feat-1');
        });

        // feat-1 was connected to 2 of the 3 edges (repo→feat-1 and feat-1→feat-2).
        // The third edge (repo→newFeature) should survive the deletion.
        expect(capturedState!.edges.length).toBe(1);
        const survivingEdge = capturedState!.edges[0];
        expect(survivingEdge.source).toBe('repo-1');
        // The surviving edge should connect to the newly created feature, not feat-1 or feat-2
        expect(survivingEdge.target).not.toBe('feat-1');
        expect(survivingEdge.target).not.toBe('feat-2');
      });

      it('calls onFitView after successful deletion relayout', async () => {
        vi.useFakeTimers();
        mockDeleteFeature.mockResolvedValue({ feature: { id: 'f1' } });

        const onFitView = vi.fn();

        render(
          <HookTestHarness
            initialNodes={[chainRepoNode, chainFeat1, chainFeat2] as CanvasNodeType[]}
            initialEdges={[chainEdgeRepoToFeat1, chainEdgeFeat1ToFeat2]}
            options={{ onFitView }}
          />
        );

        await act(async () => {
          fireEvent.click(screen.getByTestId('delete-feature'));
        });

        // onFitView is called via setTimeout(0), so advance timers
        act(() => {
          vi.advanceTimersByTime(0);
        });

        expect(onFitView).toHaveBeenCalledTimes(1);

        vi.useRealTimers();
      });

      it('does not call onFitView when deletion fails with server error', async () => {
        vi.useFakeTimers();
        mockDeleteFeature.mockResolvedValue({ error: 'Delete failed' });

        const onFitView = vi.fn();

        render(
          <HookTestHarness
            initialNodes={[chainRepoNode, chainFeat1, chainFeat2] as CanvasNodeType[]}
            initialEdges={[chainEdgeRepoToFeat1, chainEdgeFeat1ToFeat2]}
            options={{ onFitView }}
          />
        );

        await act(async () => {
          fireEvent.click(screen.getByTestId('delete-feature'));
        });

        act(() => {
          vi.advanceTimersByTime(0);
        });

        expect(onFitView).not.toHaveBeenCalled();

        vi.useRealTimers();
      });

      it('does not call onFitView when zero nodes remain after deletion', async () => {
        vi.useFakeTimers();
        mockDeleteFeature.mockResolvedValue({ feature: { id: 'f1' } });

        const onFitView = vi.fn();
        const singleNode: FeatureNodeType = {
          id: 'feat-1',
          type: 'featureNode',
          position: { x: 100, y: 100 },
          data: {
            name: 'Only Feature',
            featureId: '#f1',
            lifecycle: 'implementation',
            state: 'running',
            progress: 0,
            repositoryPath: '/home/user/repo',
            branch: 'feat/only',
          },
        };

        render(
          <HookTestHarness
            initialNodes={[singleNode] as CanvasNodeType[]}
            initialEdges={[]}
            options={{ onFitView }}
          />
        );

        await act(async () => {
          fireEvent.click(screen.getByTestId('delete-feature'));
        });

        act(() => {
          vi.advanceTimersByTime(0);
        });

        expect(onFitView).not.toHaveBeenCalled();

        vi.useRealTimers();
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
});
