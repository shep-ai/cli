import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FeaturesCanvas } from '@/components/features/features-canvas';
import type { FeatureNodeType } from '@/components/common/feature-node';

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
});
