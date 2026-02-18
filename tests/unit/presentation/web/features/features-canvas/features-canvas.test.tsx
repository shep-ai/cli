import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FeaturesCanvas } from '@/components/features/features-canvas';
import type { FeatureNodeType } from '@/components/common/feature-node';
import type { RepositoryNodeType } from '@/components/common/repository-node';

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
  });
});
