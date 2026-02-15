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
    it('adds a connected feature node with edge', () => {
      renderHook([mockFeatureNode] as CanvasNodeType[]);

      act(() => {
        fireEvent.click(screen.getByTestId('add-to-feature'));
      });

      expect(screen.getByTestId('node-count')).toHaveTextContent('2');
      expect(screen.getByTestId('edge-count')).toHaveTextContent('1');
      expect(screen.getByTestId('selected-node')).toHaveTextContent('New Feature');
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
      expect((repoNode!.data as { name: string }).name).toBe('my-org/repo');
    });
  });
});
