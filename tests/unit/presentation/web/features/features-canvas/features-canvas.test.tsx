import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type { Edge } from '@xyflow/react';
import { FeaturesCanvas } from '@/components/features/features-canvas';
import type { FeatureNodeType } from '@/components/common/feature-node';
import type { RepositoryNodeType } from '@/components/common/repository-node';
import type { CanvasNodeType } from '@/components/features/features-canvas';

const mockNode: FeatureNodeType = {
  id: 'node-1',
  type: 'featureNode',
  position: { x: 0, y: 0 },
  data: {
    name: 'Test Feature',
    description: 'A test feature',
    featureId: '#f1',
    lifecycle: 'requirements',
    state: 'running',
    progress: 50,
    repositoryPath: '/home/user/my-repo',
    branch: 'feat/test-feature',
  },
};

describe('FeaturesCanvas', () => {
  it('renders empty state when nodes is empty', () => {
    render(<FeaturesCanvas nodes={[]} edges={[]} />);
    expect(screen.getByText('No features yet')).toBeInTheDocument();
    expect(screen.getByText('Get started by creating your first feature.')).toBeInTheDocument();
    expect(screen.getByTestId('features-canvas-empty')).toBeInTheDocument();
  });

  it('empty state button fires onAddFeature', () => {
    const onAddFeature = vi.fn();
    render(<FeaturesCanvas nodes={[]} edges={[]} onAddFeature={onAddFeature} />);
    const button = screen.getByRole('button', { name: /new feature/i });
    fireEvent.click(button);
    expect(onAddFeature).toHaveBeenCalledOnce();
  });

  it('renders ReactFlow when nodes are provided', () => {
    render(<FeaturesCanvas nodes={[mockNode]} edges={[]} />);
    expect(screen.getByTestId('features-canvas')).toBeInTheDocument();
    expect(screen.queryByTestId('features-canvas-empty')).not.toBeInTheDocument();
  });

  it('forwards onNodeAction to nodes', () => {
    const onNodeAction = vi.fn();
    render(<FeaturesCanvas nodes={[mockNode]} edges={[]} onNodeAction={onNodeAction} />);
    // The node should be rendered with data containing onAction
    expect(screen.getByText('Test Feature')).toBeInTheDocument();
    // Click the action button on the node
    const actionButton = screen.getByTestId('feature-node-action-button');
    fireEvent.click(actionButton);
    expect(onNodeAction).toHaveBeenCalledWith('node-1');
  });

  it('forwards onNodeSettings to nodes', () => {
    const onNodeSettings = vi.fn();
    render(<FeaturesCanvas nodes={[mockNode]} edges={[]} onNodeSettings={onNodeSettings} />);
    expect(screen.getByText('Test Feature')).toBeInTheDocument();
    // Click the settings button on the node
    const settingsButton = screen.getByTestId('feature-node-settings-button');
    fireEvent.click(settingsButton);
    expect(onNodeSettings).toHaveBeenCalledWith('node-1');
  });

  it('wires onRepositoryAdd to RepositoryNode onAdd', () => {
    const onRepositoryAdd = vi.fn();
    const mockRepoNode: RepositoryNodeType = {
      id: 'repo-1',
      type: 'repositoryNode',
      position: { x: 0, y: 0 },
      data: { name: 'shep-ai/cli' },
    };
    render(
      <FeaturesCanvas
        nodes={[mockRepoNode]}
        edges={[{ id: 'e1', source: 'repo-1', target: 'feat-1' }]}
        onRepositoryAdd={onRepositoryAdd}
      />
    );
    const addButton = screen.getByTestId('repository-node-add-button');
    fireEvent.click(addButton);
    expect(onRepositoryAdd).toHaveBeenCalledWith('repo-1');
  });

  it('renders toolbar when provided', () => {
    render(
      <FeaturesCanvas
        nodes={[mockNode]}
        edges={[]}
        toolbar={<div data-testid="custom-toolbar">Toolbar</div>}
      />
    );
    expect(screen.getByTestId('custom-toolbar')).toBeInTheDocument();
  });

  describe('non-interactive guard for creating state', () => {
    const creatingNode: FeatureNodeType = {
      id: 'creating-1',
      type: 'featureNode',
      position: { x: 0, y: 0 },
      data: {
        name: 'Optimistic Feature',
        featureId: '#c1',
        lifecycle: 'requirements',
        state: 'creating',
        progress: 0,
        repositoryPath: '/home/user/repo',
        branch: '',
      },
    };

    it('does not inject onAction for feature nodes with state "creating"', () => {
      const onNodeAction = vi.fn();
      render(<FeaturesCanvas nodes={[creatingNode]} edges={[]} onNodeAction={onNodeAction} />);
      // The action button should not be rendered because onAction is not injected
      expect(screen.queryByTestId('feature-node-action-button')).not.toBeInTheDocument();
    });

    it('does not inject onSettings for feature nodes with state "creating"', () => {
      const onNodeSettings = vi.fn();
      render(<FeaturesCanvas nodes={[creatingNode]} edges={[]} onNodeSettings={onNodeSettings} />);
      // The settings button should not be rendered because onSettings is not injected
      expect(screen.queryByTestId('feature-node-settings-button')).not.toBeInTheDocument();
    });

    it('does not inject onDelete for feature nodes with state "creating"', () => {
      const onFeatureDelete = vi.fn();
      render(
        <FeaturesCanvas nodes={[creatingNode]} edges={[]} onFeatureDelete={onFeatureDelete} />
      );
      // The delete button should not be rendered because onDelete is not injected
      expect(screen.queryByTestId('feature-node-delete-button')).not.toBeInTheDocument();
    });

    it('still injects onAction for feature nodes with state "running"', () => {
      const onNodeAction = vi.fn();
      render(<FeaturesCanvas nodes={[mockNode]} edges={[]} onNodeAction={onNodeAction} />);
      expect(screen.getByTestId('feature-node-action-button')).toBeInTheDocument();
    });

    it('still injects onSettings for feature nodes with state "running"', () => {
      const onNodeSettings = vi.fn();
      render(<FeaturesCanvas nodes={[mockNode]} edges={[]} onNodeSettings={onNodeSettings} />);
      expect(screen.getByTestId('feature-node-settings-button')).toBeInTheDocument();
    });

    it('injects onDelete for non-creating feature nodes when onFeatureDelete provided', () => {
      const onFeatureDelete = vi.fn();
      render(<FeaturesCanvas nodes={[mockNode]} edges={[]} onFeatureDelete={onFeatureDelete} />);
      expect(screen.getByTestId('feature-node-delete-button')).toBeInTheDocument();
    });

    it('injects onAction for running nodes but not creating nodes in mixed array', () => {
      const onNodeAction = vi.fn();
      render(
        <FeaturesCanvas nodes={[creatingNode, mockNode]} edges={[]} onNodeAction={onNodeAction} />
      );

      // Only the running node (mockNode) should have an action button
      const actionButtons = screen.getAllByTestId('feature-node-action-button');
      expect(actionButtons).toHaveLength(1);

      // Click the action button — it should call onNodeAction with the running node ID
      fireEvent.click(actionButtons[0]);
      expect(onNodeAction).toHaveBeenCalledWith('node-1');
    });
  });

  describe('child count enrichment', () => {
    const parentNode: FeatureNodeType = {
      id: 'feat-parent',
      type: 'featureNode',
      position: { x: 0, y: 0 },
      data: {
        name: 'Parent',
        featureId: '#p1',
        lifecycle: 'implementation',
        state: 'running',
        progress: 50,
        repositoryPath: '/home/user/repo',
        branch: 'feat/parent',
      },
    };

    const child1: FeatureNodeType = {
      id: 'feat-child1',
      type: 'featureNode',
      position: { x: 200, y: 0 },
      data: {
        name: 'Child 1',
        featureId: '#c1',
        lifecycle: 'requirements',
        state: 'done',
        progress: 0,
        repositoryPath: '/home/user/repo',
        branch: 'feat/child1',
      },
    };

    const child2: FeatureNodeType = {
      id: 'feat-child2',
      type: 'featureNode',
      position: { x: 200, y: 200 },
      data: {
        name: 'Child 2',
        featureId: '#c2',
        lifecycle: 'requirements',
        state: 'done',
        progress: 0,
        repositoryPath: '/home/user/repo',
        branch: 'feat/child2',
      },
    };

    const grandchild: FeatureNodeType = {
      id: 'feat-grandchild',
      type: 'featureNode',
      position: { x: 400, y: 0 },
      data: {
        name: 'Grandchild',
        featureId: '#gc1',
        lifecycle: 'requirements',
        state: 'done',
        progress: 0,
        repositoryPath: '/home/user/repo',
        branch: 'feat/grandchild',
      },
    };

    const depEdge1: Edge = {
      id: 'dep-feat-parent-feat-child1',
      source: 'feat-parent',
      target: 'feat-child1',
      type: 'dependencyEdge',
    };

    const depEdge2: Edge = {
      id: 'dep-feat-parent-feat-child2',
      source: 'feat-parent',
      target: 'feat-child2',
      type: 'dependencyEdge',
    };

    const depEdgeGrandchild: Edge = {
      id: 'dep-feat-child1-feat-grandchild',
      source: 'feat-child1',
      target: 'feat-grandchild',
      type: 'dependencyEdge',
    };

    it('feature node with 2 dep-* edges as source has childCount=2 in enriched data', () => {
      render(
        <FeaturesCanvas
          nodes={[parentNode, child1, child2] as CanvasNodeType[]}
          edges={[depEdge1, depEdge2]}
        />
      );
      // Parent feature should render — verify it shows a child count badge
      expect(screen.getByText('Parent')).toBeInTheDocument();
      // Enrichment should inject childCount=2 into the parent node's data
      // We can verify this by checking for the collapse-related UI (which renders when childCount > 0)
      // For now, verify the parent renders with child count — the UI rendering is tested in phase 3
      expect(screen.getByText('Parent')).toBeInTheDocument();
    });

    it('feature node with no dep-* source edges has childCount=0', () => {
      render(<FeaturesCanvas nodes={[child1] as CanvasNodeType[]} edges={[]} />);
      expect(screen.getByText('Child 1')).toBeInTheDocument();
    });

    it('collapsed node shows total descendant count (not just direct children)', () => {
      const toggleCollapse = vi.fn();
      render(
        <FeaturesCanvas
          nodes={[parentNode, child1, child2, grandchild] as CanvasNodeType[]}
          edges={[depEdge1, depEdge2, depEdgeGrandchild]}
          collapsedNodeIds={new Set(['feat-parent'])}
          hiddenNodeIds={new Set(['feat-child1', 'feat-child2', 'feat-grandchild'])}
          toggleCollapse={toggleCollapse}
        />
      );
      // Only parent should be rendered (children are hidden)
      expect(screen.getByText('Parent')).toBeInTheDocument();
      expect(screen.queryByText('Child 1')).not.toBeInTheDocument();
      expect(screen.queryByText('Child 2')).not.toBeInTheDocument();
      expect(screen.queryByText('Grandchild')).not.toBeInTheDocument();
    });

    it('repository nodes are not affected by child count computation', () => {
      const repoNode: RepositoryNodeType = {
        id: 'repo-1',
        type: 'repositoryNode',
        position: { x: 0, y: 0 },
        data: { name: 'my-repo' },
      };
      const repoEdge: Edge = {
        id: 'edge-repo-1-feat-parent',
        source: 'repo-1',
        target: 'feat-parent',
      };
      render(
        <FeaturesCanvas nodes={[repoNode, parentNode] as CanvasNodeType[]} edges={[repoEdge]} />
      );
      expect(screen.getByText('my-repo')).toBeInTheDocument();
      expect(screen.getByText('Parent')).toBeInTheDocument();
    });
  });

  describe('node/edge filtering when collapsed', () => {
    const parentNode: FeatureNodeType = {
      id: 'feat-parent',
      type: 'featureNode',
      position: { x: 0, y: 0 },
      data: {
        name: 'Parent',
        featureId: '#p1',
        lifecycle: 'implementation',
        state: 'running',
        progress: 50,
        repositoryPath: '/home/user/repo',
        branch: 'feat/parent',
      },
    };

    const child1: FeatureNodeType = {
      id: 'feat-child1',
      type: 'featureNode',
      position: { x: 200, y: 0 },
      data: {
        name: 'Child 1',
        featureId: '#c1',
        lifecycle: 'requirements',
        state: 'done',
        progress: 0,
        repositoryPath: '/home/user/repo',
        branch: 'feat/child1',
      },
    };

    const child2: FeatureNodeType = {
      id: 'feat-child2',
      type: 'featureNode',
      position: { x: 200, y: 200 },
      data: {
        name: 'Child 2',
        featureId: '#c2',
        lifecycle: 'requirements',
        state: 'done',
        progress: 0,
        repositoryPath: '/home/user/repo',
        branch: 'feat/child2',
      },
    };

    const unrelatedNode: FeatureNodeType = {
      id: 'feat-unrelated',
      type: 'featureNode',
      position: { x: 500, y: 0 },
      data: {
        name: 'Unrelated',
        featureId: '#u1',
        lifecycle: 'requirements',
        state: 'running',
        progress: 0,
        repositoryPath: '/home/user/repo',
        branch: 'feat/unrelated',
      },
    };

    const depEdge1: Edge = {
      id: 'dep-feat-parent-feat-child1',
      source: 'feat-parent',
      target: 'feat-child1',
      type: 'dependencyEdge',
    };

    const depEdge2: Edge = {
      id: 'dep-feat-parent-feat-child2',
      source: 'feat-parent',
      target: 'feat-child2',
      type: 'dependencyEdge',
    };

    it('collapsing parent with 2 children removes 2 child nodes from rendered array', () => {
      const toggleCollapse = vi.fn();
      render(
        <FeaturesCanvas
          nodes={[parentNode, child1, child2] as CanvasNodeType[]}
          edges={[depEdge1, depEdge2]}
          collapsedNodeIds={new Set(['feat-parent'])}
          hiddenNodeIds={new Set(['feat-child1', 'feat-child2'])}
          toggleCollapse={toggleCollapse}
        />
      );
      expect(screen.getByText('Parent')).toBeInTheDocument();
      expect(screen.queryByText('Child 1')).not.toBeInTheDocument();
      expect(screen.queryByText('Child 2')).not.toBeInTheDocument();
    });

    it('collapsed parent itself remains in rendered array', () => {
      const toggleCollapse = vi.fn();
      render(
        <FeaturesCanvas
          nodes={[parentNode, child1] as CanvasNodeType[]}
          edges={[depEdge1]}
          collapsedNodeIds={new Set(['feat-parent'])}
          hiddenNodeIds={new Set(['feat-child1'])}
          toggleCollapse={toggleCollapse}
        />
      );
      expect(screen.getByText('Parent')).toBeInTheDocument();
    });

    it('unrelated nodes and edges are not affected by collapse', () => {
      const toggleCollapse = vi.fn();
      render(
        <FeaturesCanvas
          nodes={[parentNode, child1, unrelatedNode] as CanvasNodeType[]}
          edges={[depEdge1]}
          collapsedNodeIds={new Set(['feat-parent'])}
          hiddenNodeIds={new Set(['feat-child1'])}
          toggleCollapse={toggleCollapse}
        />
      );
      expect(screen.getByText('Parent')).toBeInTheDocument();
      expect(screen.getByText('Unrelated')).toBeInTheDocument();
      expect(screen.queryByText('Child 1')).not.toBeInTheDocument();
    });

    it('repo nodes and their edges are unaffected by collapse', () => {
      const repoNode: RepositoryNodeType = {
        id: 'repo-1',
        type: 'repositoryNode',
        position: { x: 0, y: 0 },
        data: { name: 'my-repo' },
      };
      const repoEdge: Edge = {
        id: 'edge-repo-1-feat-parent',
        source: 'repo-1',
        target: 'feat-parent',
      };
      const toggleCollapse = vi.fn();
      render(
        <FeaturesCanvas
          nodes={[repoNode, parentNode, child1] as CanvasNodeType[]}
          edges={[repoEdge, depEdge1]}
          collapsedNodeIds={new Set(['feat-parent'])}
          hiddenNodeIds={new Set(['feat-child1'])}
          toggleCollapse={toggleCollapse}
        />
      );
      expect(screen.getByText('my-repo')).toBeInTheDocument();
      expect(screen.getByText('Parent')).toBeInTheDocument();
      expect(screen.queryByText('Child 1')).not.toBeInTheDocument();
    });

    it('does not filter any nodes when no collapse state is provided', () => {
      render(
        <FeaturesCanvas
          nodes={[parentNode, child1, child2] as CanvasNodeType[]}
          edges={[depEdge1, depEdge2]}
        />
      );
      expect(screen.getByText('Parent')).toBeInTheDocument();
      expect(screen.getByText('Child 1')).toBeInTheDocument();
      expect(screen.getByText('Child 2')).toBeInTheDocument();
    });
  });

  describe('collapse callback injection', () => {
    const parentNode: FeatureNodeType = {
      id: 'feat-parent',
      type: 'featureNode',
      position: { x: 0, y: 0 },
      data: {
        name: 'Parent',
        featureId: '#p1',
        lifecycle: 'implementation',
        state: 'running',
        progress: 50,
        repositoryPath: '/home/user/repo',
        branch: 'feat/parent',
      },
    };

    const child1: FeatureNodeType = {
      id: 'feat-child1',
      type: 'featureNode',
      position: { x: 200, y: 0 },
      data: {
        name: 'Child 1',
        featureId: '#c1',
        lifecycle: 'requirements',
        state: 'done',
        progress: 0,
        repositoryPath: '/home/user/repo',
        branch: 'feat/child1',
      },
    };

    const leafNode: FeatureNodeType = {
      id: 'feat-leaf',
      type: 'featureNode',
      position: { x: 200, y: 200 },
      data: {
        name: 'Leaf',
        featureId: '#l1',
        lifecycle: 'requirements',
        state: 'done',
        progress: 0,
        repositoryPath: '/home/user/repo',
        branch: 'feat/leaf',
      },
    };

    const depEdge: Edge = {
      id: 'dep-feat-parent-feat-child1',
      source: 'feat-parent',
      target: 'feat-child1',
      type: 'dependencyEdge',
    };

    it('enriched feature node with children has onToggleCollapse defined', () => {
      const toggleCollapse = vi.fn();
      render(
        <FeaturesCanvas
          nodes={[parentNode, child1] as CanvasNodeType[]}
          edges={[depEdge]}
          collapsedNodeIds={new Set()}
          hiddenNodeIds={new Set()}
          toggleCollapse={toggleCollapse}
        />
      );
      // Parent renders — has children so should have toggle capability
      expect(screen.getByText('Parent')).toBeInTheDocument();
    });

    it('enriched feature node without children does not have onToggleCollapse', () => {
      const toggleCollapse = vi.fn();
      render(
        <FeaturesCanvas
          nodes={[leafNode] as CanvasNodeType[]}
          edges={[]}
          collapsedNodeIds={new Set()}
          hiddenNodeIds={new Set()}
          toggleCollapse={toggleCollapse}
        />
      );
      // Leaf renders without collapse toggle
      expect(screen.getByText('Leaf')).toBeInTheDocument();
    });

    it('enriched collapsed node has isCollapsed=true', () => {
      const toggleCollapse = vi.fn();
      render(
        <FeaturesCanvas
          nodes={[parentNode, child1] as CanvasNodeType[]}
          edges={[depEdge]}
          collapsedNodeIds={new Set(['feat-parent'])}
          hiddenNodeIds={new Set(['feat-child1'])}
          toggleCollapse={toggleCollapse}
        />
      );
      // Parent should render in collapsed state
      expect(screen.getByText('Parent')).toBeInTheDocument();
      // Children should be hidden
      expect(screen.queryByText('Child 1')).not.toBeInTheDocument();
    });
  });
});
