import { describe, it, expect } from 'vitest';
import { render, screen, act, fireEvent } from '@testing-library/react';
import type { Edge } from '@xyflow/react';
import { useControlCenterState } from '@/components/features/control-center/use-control-center-state';
import type { ControlCenterState } from '@/components/features/control-center/use-control-center-state';
import type { FeatureNodeType } from '@/components/common/feature-node';
import type { RepositoryNodeType } from '@/components/common/repository-node';
import type { AddRepositoryNodeType } from '@/components/common/add-repository-node';
import type { CanvasNodeType } from '@/components/features/features-canvas';

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
      <button data-testid="add-feature" onClick={state.handleAddFeature}>
        Add Feature
      </button>
      <button data-testid="add-to-repo" onClick={() => state.handleAddFeatureToRepo('repo-1')}>
        Add to Repo
      </button>
      <button data-testid="add-to-repo-2" onClick={() => state.handleAddFeatureToRepo('repo-2')}>
        Add to Repo 2
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
    it('adds a new unconnected feature node', () => {
      renderHook();

      act(() => {
        fireEvent.click(screen.getByTestId('add-feature'));
      });

      expect(screen.getByTestId('node-count')).toHaveTextContent('1');
      expect(screen.getByTestId('edge-count')).toHaveTextContent('0');
      expect(screen.getByTestId('selected-node')).toHaveTextContent('New Feature');
    });
  });

  describe('handleAddFeatureToRepo', () => {
    it('adds a connected feature node with edge', () => {
      renderHook([mockRepoNode] as CanvasNodeType[]);

      act(() => {
        fireEvent.click(screen.getByTestId('add-to-repo'));
      });

      expect(screen.getByTestId('node-count')).toHaveTextContent('2');
      expect(screen.getByTestId('edge-count')).toHaveTextContent('1');
      expect(screen.getByTestId('selected-node')).toHaveTextContent('New Feature');
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

  describe('createFeatureNode positioning', () => {
    // Simulate a dagre-laid-out canvas with two repos, each having features
    const repo1: RepositoryNodeType = {
      id: 'repo-1',
      type: 'repositoryNode',
      position: { x: 0, y: 70 },
      data: { name: 'org/repo-a' },
    };
    const feat1: FeatureNodeType = {
      id: 'feat-1',
      type: 'featureNode',
      position: { x: 340, y: 0 },
      data: {
        name: 'Feature A',
        featureId: '#a',
        lifecycle: 'implementation',
        state: 'done',
        progress: 100,
      },
    };
    const feat2: FeatureNodeType = {
      id: 'feat-2',
      type: 'featureNode',
      position: { x: 340, y: 160 },
      data: {
        name: 'Feature B',
        featureId: '#b',
        lifecycle: 'requirements',
        state: 'done',
        progress: 100,
      },
    };

    const repo2: RepositoryNodeType = {
      id: 'repo-2',
      type: 'repositoryNode',
      position: { x: 0, y: 400 },
      data: { name: 'org/repo-b' },
    };
    const feat3: FeatureNodeType = {
      id: 'feat-3',
      type: 'featureNode',
      position: { x: 340, y: 400 },
      data: {
        name: 'Feature C',
        featureId: '#c',
        lifecycle: 'research',
        state: 'running',
        progress: 30,
      },
    };

    const twoGroupNodes = [repo1, feat1, feat2, repo2, feat3] as CanvasNodeType[];
    const twoGroupEdges: Edge[] = [
      { id: 'e-r1-f1', source: 'repo-1', target: 'feat-1' },
      { id: 'e-r1-f2', source: 'repo-1', target: 'feat-2' },
      { id: 'e-r2-f3', source: 'repo-2', target: 'feat-3' },
    ];

    it('places new feature below existing siblings in the same group', () => {
      let capturedState: ControlCenterState | null = null;
      renderHook(twoGroupNodes, twoGroupEdges, (state) => {
        capturedState = state;
      });

      act(() => {
        fireEvent.click(screen.getByTestId('add-to-repo'));
      });

      const newNode = capturedState!.nodes.find(
        (n) =>
          n.type === 'featureNode' && n.id !== 'feat-1' && n.id !== 'feat-2' && n.id !== 'feat-3'
      );
      const existingFeat1 = capturedState!.nodes.find((n) => n.id === 'feat-1')!;
      const existingFeat2 = capturedState!.nodes.find((n) => n.id === 'feat-2')!;

      expect(newNode).toBeDefined();
      // New node must be below both existing siblings
      expect(newNode!.position.y).toBeGreaterThan(existingFeat1.position.y);
      expect(newNode!.position.y).toBeGreaterThan(existingFeat2.position.y);
    });

    it('places second new feature below the first new feature', () => {
      let capturedState: ControlCenterState | null = null;
      renderHook(twoGroupNodes, twoGroupEdges, (state) => {
        capturedState = state;
      });

      // Add first feature
      act(() => {
        fireEvent.click(screen.getByTestId('add-to-repo'));
      });
      const firstNewId = capturedState!.nodes.find(
        (n) => n.type === 'featureNode' && !['feat-1', 'feat-2', 'feat-3'].includes(n.id)
      )!.id;

      // Add second feature
      act(() => {
        fireEvent.click(screen.getByTestId('add-to-repo'));
      });

      const allNewNodes = capturedState!.nodes.filter(
        (n) => n.type === 'featureNode' && !['feat-1', 'feat-2', 'feat-3'].includes(n.id)
      );
      expect(allNewNodes).toHaveLength(2);

      const firstNew = allNewNodes.find((n) => n.id === firstNewId)!;
      const secondNew = allNewNodes.find((n) => n.id !== firstNewId)!;

      // Second must be below first
      expect(secondNew.position.y).toBeGreaterThan(firstNew.position.y);
      // Both must be below existing siblings
      const existingFeat2 = capturedState!.nodes.find((n) => n.id === 'feat-2')!;
      expect(firstNew.position.y).toBeGreaterThan(existingFeat2.position.y);
    });

    it('shifts groups below down to avoid overlap', () => {
      let capturedState: ControlCenterState | null = null;
      renderHook(twoGroupNodes, twoGroupEdges, (state) => {
        capturedState = state;
      });

      // Capture repo-2 group positions before
      const repo2Before = capturedState!.nodes.find((n) => n.id === 'repo-2')!;
      const feat3Before = capturedState!.nodes.find((n) => n.id === 'feat-3')!;
      const repo2YBefore = repo2Before.position.y;
      const feat3YBefore = feat3Before.position.y;

      // Add feature to repo-1 — this extends the group downward
      act(() => {
        fireEvent.click(screen.getByTestId('add-to-repo'));
      });

      const repo2After = capturedState!.nodes.find((n) => n.id === 'repo-2')!;
      const feat3After = capturedState!.nodes.find((n) => n.id === 'feat-3')!;
      const newNode = capturedState!.nodes.find(
        (n) => n.type === 'featureNode' && !['feat-1', 'feat-2', 'feat-3'].includes(n.id)
      )!;

      // Groups below must shift down
      expect(repo2After.position.y).toBeGreaterThan(repo2YBefore);
      expect(feat3After.position.y).toBeGreaterThan(feat3YBefore);

      // The new node must NOT overlap with the repo-2 group
      // featureNode height = 140
      expect(newNode.position.y + 140).toBeLessThanOrEqual(repo2After.position.y);

      // X positions should not change
      expect(repo2After.position.x).toBe(repo2Before.position.x);
      expect(feat3After.position.x).toBe(feat3Before.position.x);
    });

    it('does not shift groups above when adding to a lower group', () => {
      let capturedState: ControlCenterState | null = null;
      renderHook(twoGroupNodes, twoGroupEdges, (state) => {
        capturedState = state;
      });

      // Capture repo-1 group positions before
      const repo1Before = capturedState!.nodes.find((n) => n.id === 'repo-1')!;
      const feat1Before = capturedState!.nodes.find((n) => n.id === 'feat-1')!;
      const feat2Before = capturedState!.nodes.find((n) => n.id === 'feat-2')!;
      const repo1PosBefore = { ...repo1Before.position };
      const feat1PosBefore = { ...feat1Before.position };
      const feat2PosBefore = { ...feat2Before.position };

      // Add feature to repo-2 (the lower group)
      act(() => {
        fireEvent.click(screen.getByTestId('add-to-repo-2'));
      });

      const repo1After = capturedState!.nodes.find((n) => n.id === 'repo-1')!;
      const feat1After = capturedState!.nodes.find((n) => n.id === 'feat-1')!;
      const feat2After = capturedState!.nodes.find((n) => n.id === 'feat-2')!;

      // Groups above must NOT move
      expect(repo1After.position).toEqual(repo1PosBefore);
      expect(feat1After.position).toEqual(feat1PosBefore);
      expect(feat2After.position).toEqual(feat2PosBefore);
    });

    it('keeps repo node vertically centered to its feature group', () => {
      let capturedState: ControlCenterState | null = null;
      renderHook(twoGroupNodes, twoGroupEdges, (state) => {
        capturedState = state;
      });

      act(() => {
        fireEvent.click(screen.getByTestId('add-to-repo'));
      });

      const repo1 = capturedState!.nodes.find((n) => n.id === 'repo-1')!;
      const childNodes = capturedState!.nodes.filter(
        (n) =>
          n.type === 'featureNode' &&
          capturedState!.edges.some((e) => e.source === 'repo-1' && e.target === n.id)
      );

      // repo center = children group center
      // children group center = (minY + maxY + featureHeight) / 2
      const childYs = childNodes.map((n) => n.position.y);
      const groupCenter = (Math.min(...childYs) + Math.max(...childYs) + 140) / 2;
      const repoCenter = repo1.position.y + 50 / 2; // repoNode height = 50

      expect(repoCenter).toBe(groupCenter);
    });

    it('keeps repo node centered after adding multiple features', () => {
      let capturedState: ControlCenterState | null = null;
      renderHook(twoGroupNodes, twoGroupEdges, (state) => {
        capturedState = state;
      });

      // Add two features
      act(() => {
        fireEvent.click(screen.getByTestId('add-to-repo'));
      });
      act(() => {
        fireEvent.click(screen.getByTestId('add-to-repo'));
      });

      const repo1 = capturedState!.nodes.find((n) => n.id === 'repo-1')!;
      const childNodes = capturedState!.nodes.filter(
        (n) =>
          n.type === 'featureNode' &&
          capturedState!.edges.some((e) => e.source === 'repo-1' && e.target === n.id)
      );

      const childYs = childNodes.map((n) => n.position.y);
      const groupCenter = (Math.min(...childYs) + Math.max(...childYs) + 140) / 2;
      const repoCenter = repo1.position.y + 50 / 2;

      expect(repoCenter).toBe(groupCenter);
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
});
