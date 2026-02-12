import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FeatureFlowCanvas } from '@/components/features/feature-flow-canvas';
import type { FeatureNodeType } from '@/components/common/feature-node';
import type { Edge } from '@xyflow/react';

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

const mockNode2: FeatureNodeType = {
  id: 'node-2',
  type: 'featureNode',
  position: { x: 300, y: 0 },
  data: {
    name: 'Second Feature',
    description: 'Another feature',
    featureId: '#f2',
    lifecycle: 'plan',
    state: 'done',
    progress: 100,
  },
};

const mockEdge: Edge = {
  id: 'e1-2',
  source: 'node-1',
  target: 'node-2',
};

describe('FeatureFlowCanvas', () => {
  it('renders empty state when nodes is empty', () => {
    render(<FeatureFlowCanvas nodes={[]} edges={[]} />);
    expect(screen.getByText('No features yet')).toBeInTheDocument();
    expect(screen.getByText('Get started by creating your first feature.')).toBeInTheDocument();
    expect(screen.getByTestId('feature-flow-canvas-empty')).toBeInTheDocument();
  });

  it('empty state button fires onAddFeature', () => {
    const onAddFeature = vi.fn();
    render(<FeatureFlowCanvas nodes={[]} edges={[]} onAddFeature={onAddFeature} />);
    const button = screen.getByRole('button', { name: /new feature/i });
    fireEvent.click(button);
    expect(onAddFeature).toHaveBeenCalledOnce();
  });

  it('renders ReactFlow when nodes are provided', () => {
    render(<FeatureFlowCanvas nodes={[mockNode]} edges={[]} />);
    expect(screen.getByTestId('feature-flow-canvas')).toBeInTheDocument();
    expect(screen.queryByTestId('feature-flow-canvas-empty')).not.toBeInTheDocument();
  });

  it('forwards onNodeAction to nodes', () => {
    const onNodeAction = vi.fn();
    render(<FeatureFlowCanvas nodes={[mockNode]} edges={[]} onNodeAction={onNodeAction} />);
    // The node should be rendered with data containing onAction
    expect(screen.getByText('Test Feature')).toBeInTheDocument();
    // Click the action button on the node
    const actionButton = screen.getByTestId('feature-node-action-button');
    fireEvent.click(actionButton);
    expect(onNodeAction).toHaveBeenCalledWith('node-1');
  });

  it('forwards onNodeSettings to nodes', () => {
    const onNodeSettings = vi.fn();
    render(<FeatureFlowCanvas nodes={[mockNode]} edges={[]} onNodeSettings={onNodeSettings} />);
    expect(screen.getByText('Test Feature')).toBeInTheDocument();
    // Click the settings button on the node
    const settingsButton = screen.getByTestId('feature-node-settings-button');
    fireEvent.click(settingsButton);
    expect(onNodeSettings).toHaveBeenCalledWith('node-1');
  });
});
