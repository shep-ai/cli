import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FeaturesCanvas } from '@/components/features/features-canvas';
import type { FeatureNodeType } from '@/components/common/feature-node';
import type { RepositoryNodeType } from '@/components/common/repository-node';

const mockOnAction = vi.fn();
const mockOnSettings = vi.fn();
const mockOnDelete = vi.fn();

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
    onAction: () => mockOnAction('node-1'),
    onSettings: () => mockOnSettings('node-1'),
    onDelete: mockOnDelete,
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

  it('renders node with onAction callback from node data', () => {
    render(<FeaturesCanvas nodes={[mockNode]} edges={[]} />);
    expect(screen.getByText('Test Feature')).toBeInTheDocument();
    const actionButton = screen.getByTestId('feature-node-action-button');
    fireEvent.click(actionButton);
    expect(mockOnAction).toHaveBeenCalledWith('node-1');
  });

  it('renders node with onSettings callback from node data', () => {
    render(<FeaturesCanvas nodes={[mockNode]} edges={[]} />);
    expect(screen.getByText('Test Feature')).toBeInTheDocument();
    const settingsButton = screen.getByTestId('feature-node-settings-button');
    fireEvent.click(settingsButton);
    expect(mockOnSettings).toHaveBeenCalledWith('node-1');
  });

  it('wires onAdd from repository node data', () => {
    const mockOnAdd = vi.fn();
    const mockRepoNode: RepositoryNodeType = {
      id: 'repo-1',
      type: 'repositoryNode',
      position: { x: 0, y: 0 },
      data: { name: 'shep-ai/cli', onAdd: mockOnAdd, showHandles: true },
    };
    render(
      <FeaturesCanvas
        nodes={[mockRepoNode]}
        edges={[{ id: 'e1', source: 'repo-1', target: 'feat-1' }]}
      />
    );
    const addButton = screen.getByTestId('repository-node-add-button');
    fireEvent.click(addButton);
    expect(mockOnAdd).toHaveBeenCalled();
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
        // No onAction/onSettings/onDelete — creating nodes don't get callbacks
      },
    };

    it('does not show action button for feature nodes with state "creating"', () => {
      render(<FeaturesCanvas nodes={[creatingNode]} edges={[]} />);
      expect(screen.queryByTestId('feature-node-action-button')).not.toBeInTheDocument();
    });

    it('does not show settings button for feature nodes with state "creating"', () => {
      render(<FeaturesCanvas nodes={[creatingNode]} edges={[]} />);
      expect(screen.queryByTestId('feature-node-settings-button')).not.toBeInTheDocument();
    });

    it('does not show delete button for feature nodes with state "creating"', () => {
      render(<FeaturesCanvas nodes={[creatingNode]} edges={[]} />);
      expect(screen.queryByTestId('feature-node-delete-button')).not.toBeInTheDocument();
    });

    it('shows action button for feature nodes with state "running" (callbacks in data)', () => {
      render(<FeaturesCanvas nodes={[mockNode]} edges={[]} />);
      expect(screen.getByTestId('feature-node-action-button')).toBeInTheDocument();
    });

    it('shows settings button for feature nodes with state "running" (callbacks in data)', () => {
      render(<FeaturesCanvas nodes={[mockNode]} edges={[]} />);
      expect(screen.getByTestId('feature-node-settings-button')).toBeInTheDocument();
    });

    it('shows delete button for non-creating feature nodes (onDelete in data)', () => {
      render(<FeaturesCanvas nodes={[mockNode]} edges={[]} />);
      expect(screen.getByTestId('feature-node-delete-button')).toBeInTheDocument();
    });

    it('only running nodes have action buttons in mixed array', () => {
      render(<FeaturesCanvas nodes={[creatingNode, mockNode]} edges={[]} />);
      const actionButtons = screen.getAllByTestId('feature-node-action-button');
      expect(actionButtons).toHaveLength(1);
      fireEvent.click(actionButtons[0]);
      expect(mockOnAction).toHaveBeenCalledWith('node-1');
    });
  });
});
