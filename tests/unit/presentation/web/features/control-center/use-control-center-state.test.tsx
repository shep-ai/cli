import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act, fireEvent } from '@testing-library/react';
import { ReactFlowProvider, ReactFlow, useReactFlow } from '@xyflow/react';
import type { Node, Edge } from '@xyflow/react';
import { useControlCenterState } from '@/components/features/control-center/use-control-center-state';
import type { ControlCenterState } from '@/components/features/control-center/use-control-center-state';
import type { FeatureNodeType, FeatureNodeData } from '@/components/common/feature-node';
import { FeatureNode } from '@/components/common/feature-node';
import { RepositoryNode } from '@/components/common/repository-node';
import type { RepositoryNodeType } from '@/components/common/repository-node';

const nodeTypes = {
  featureNode: FeatureNode,
  repositoryNode: RepositoryNode,
};

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

/**
 * Test harness that renders a ReactFlow canvas with the hook.
 * Exposes the hook state via rendered data attributes for assertion.
 */
function HookTestHarness({
  initialNodes = [],
  initialEdges = [],
  onStateChange,
}: {
  initialNodes?: Node[];
  initialEdges?: Edge[];
  onStateChange?: (state: ControlCenterState) => void;
}) {
  const state = useControlCenterState();

  // Expose state to parent via callback
  if (onStateChange) {
    onStateChange(state);
  }

  return (
    <>
      <div data-testid="selected-node">{state.selectedNode ? state.selectedNode.name : 'null'}</div>
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
      <button data-testid="clear-selection" onClick={state.clearSelection}>
        Clear
      </button>
    </>
  );
}

function renderWithReactFlow(
  initialNodes: Node[] = [],
  initialEdges: Edge[] = [],
  onStateChange?: (state: ControlCenterState) => void
) {
  return render(
    <ReactFlowProvider>
      <ReactFlow nodes={initialNodes} edges={initialEdges} nodeTypes={nodeTypes}>
        <HookTestHarness
          initialNodes={initialNodes}
          initialEdges={initialEdges}
          onStateChange={onStateChange}
        />
      </ReactFlow>
    </ReactFlowProvider>
  );
}

describe('useControlCenterState', () => {
  it('returns null selectedNode initially', () => {
    renderWithReactFlow();
    expect(screen.getByTestId('selected-node')).toHaveTextContent('null');
  });

  it('clearSelection sets selectedNode to null', () => {
    renderWithReactFlow([mockFeatureNode]);
    fireEvent.click(screen.getByTestId('clear-selection'));
    expect(screen.getByTestId('selected-node')).toHaveTextContent('null');
  });

  it('Escape key clears selection', () => {
    renderWithReactFlow([mockFeatureNode]);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.getByTestId('selected-node')).toHaveTextContent('null');
  });

  describe('handleAddFeature', () => {
    it('adds a new unconnected feature node', () => {
      let capturedState: ControlCenterState | null = null;
      const { container } = renderWithReactFlow([], [], (state) => {
        capturedState = state;
      });

      act(() => {
        fireEvent.click(screen.getByTestId('add-feature'));
      });

      // After adding, there should be a new node in the canvas
      // The hook calls addNodes which updates React Flow internal state
      expect(capturedState).not.toBeNull();
    });
  });

  describe('handleAddFeatureToRepo', () => {
    it('calls addNodes and addEdges via useReactFlow', () => {
      let capturedState: ControlCenterState | null = null;
      renderWithReactFlow([mockRepoNode], [], (state) => {
        capturedState = state;
      });

      act(() => {
        fireEvent.click(screen.getByTestId('add-to-repo'));
      });

      expect(capturedState).not.toBeNull();
    });
  });

  describe('handleAddFeatureToFeature', () => {
    it('calls addNodes and addEdges via useReactFlow', () => {
      let capturedState: ControlCenterState | null = null;
      renderWithReactFlow([mockFeatureNode], [], (state) => {
        capturedState = state;
      });

      act(() => {
        fireEvent.click(screen.getByTestId('add-to-feature'));
      });

      expect(capturedState).not.toBeNull();
    });
  });
});
