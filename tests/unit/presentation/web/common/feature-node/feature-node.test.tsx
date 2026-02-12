import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ReactFlowProvider, ReactFlow } from '@xyflow/react';
import { FeatureNode } from '@/components/common/feature-node';
import type { FeatureNodeData, FeatureNodeType } from '@/components/common/feature-node';

const nodeTypes = { featureNode: FeatureNode };

const defaultData: FeatureNodeData = {
  name: 'Auth Module',
  description: 'Implement authentication flow',
  featureId: '#f1',
  lifecycle: 'requirements',
  state: 'running',
  progress: 45,
};

function renderFeatureNode(
  dataOverrides?: Partial<FeatureNodeData>,
  nodeOverrides?: Partial<Omit<FeatureNodeType, 'data'>>
) {
  const data = { ...defaultData, ...dataOverrides };
  const nodes: FeatureNodeType[] = [
    { id: 'test-node', type: 'featureNode', position: { x: 0, y: 0 }, data, ...nodeOverrides },
  ];
  return render(
    <ReactFlowProvider>
      <ReactFlow nodes={nodes} nodeTypes={nodeTypes} proOptions={{ hideAttribution: true }} />
    </ReactFlowProvider>
  );
}

describe('FeatureNode', () => {
  it('renders lifecycle phase label in uppercase', () => {
    renderFeatureNode({ lifecycle: 'requirements' });
    expect(screen.getByText('REQUIREMENTS')).toBeInTheDocument();
  });

  it('renders feature name', () => {
    renderFeatureNode({ name: 'Auth Module' });
    expect(screen.getByText('Auth Module')).toBeInTheDocument();
  });

  it('renders description', () => {
    renderFeatureNode({ description: 'Implement authentication flow' });
    expect(screen.getByText('Implement authentication flow')).toBeInTheDocument();
  });

  it('renders featureId', () => {
    renderFeatureNode({ featureId: '#f1' });
    expect(screen.getByText('#f1')).toBeInTheDocument();
  });

  it('renders progress percentage for running state', () => {
    renderFeatureNode({ state: 'running', progress: 45 });
    expect(screen.getByText('45%')).toBeInTheDocument();
  });

  it('renders progress bar for running state', () => {
    renderFeatureNode({ state: 'running', progress: 60 });
    const progressBar = screen.getByTestId('feature-node-progress-bar');
    expect(progressBar).toBeInTheDocument();
  });

  it('action button fires onAction callback', () => {
    const onAction = vi.fn();
    renderFeatureNode({ onAction });
    const actionButton = screen.getByTestId('feature-node-action-button');
    fireEvent.click(actionButton);
    expect(onAction).toHaveBeenCalledOnce();
  });

  it('settings icon fires onSettings callback', () => {
    const onSettings = vi.fn();
    renderFeatureNode({ onSettings });
    const settingsButton = screen.getByTestId('feature-node-settings-button');
    fireEvent.click(settingsButton);
    expect(onSettings).toHaveBeenCalledOnce();
  });

  it('renders Handle components when showHandles is true', () => {
    const { container } = renderFeatureNode({ showHandles: true });
    const handles = container.querySelectorAll('.react-flow__handle');
    expect(handles.length).toBeGreaterThanOrEqual(2);
  });

  it.each([
    ['running', 'border-l-blue-500'],
    ['action-required', 'border-l-amber-500'],
    ['done', 'border-l-emerald-500'],
    ['blocked', 'border-l-gray-400'],
    ['error', 'border-l-red-500'],
  ] as const)('applies correct border color for %s state', (state, expectedClass) => {
    renderFeatureNode({ state });
    const card = screen.getByTestId('feature-node-card');
    expect(card.className).toContain(expectedClass);
  });

  it.each([
    ['running', 'text-blue-500'],
    ['action-required', 'text-amber-500'],
    ['done', 'text-emerald-500'],
    ['blocked', 'text-gray-400'],
    ['error', 'text-red-500'],
  ] as const)('applies correct label color for %s state', (state, expectedClass) => {
    renderFeatureNode({ state });
    const label = screen.getByTestId('feature-node-lifecycle-label');
    expect(label.className).toContain(expectedClass);
  });

  it('renders all lifecycle phases correctly', () => {
    const phases = [
      'requirements',
      'plan',
      'implementation',
      'test',
      'deploy',
      'maintenance',
    ] as const;
    for (const phase of phases) {
      const { unmount } = renderFeatureNode({ lifecycle: phase });
      expect(screen.getByText(phase.toUpperCase())).toBeInTheDocument();
      unmount();
    }
  });

  it('renders without description when not provided', () => {
    renderFeatureNode({ description: undefined });
    expect(screen.queryByTestId('feature-node-description')).not.toBeInTheDocument();
  });

  describe('done state', () => {
    it('shows badge instead of progress bar', () => {
      renderFeatureNode({ state: 'done', progress: 100 });
      expect(screen.queryByTestId('feature-node-progress-bar')).not.toBeInTheDocument();
      expect(screen.getByTestId('feature-node-badge')).toBeInTheDocument();
    });

    it('shows "Completed" when no runtime provided', () => {
      renderFeatureNode({ state: 'done', progress: 100 });
      expect(screen.getByText('Completed')).toBeInTheDocument();
    });

    it('shows runtime when provided', () => {
      renderFeatureNode({ state: 'done', progress: 100, runtime: '2h 15m' });
      expect(screen.getByText('Completed in 2h 15m')).toBeInTheDocument();
    });

    it('does not show progress percentage', () => {
      renderFeatureNode({ state: 'done', progress: 100 });
      expect(screen.queryByText('100%')).not.toBeInTheDocument();
    });
  });

  describe('blocked state', () => {
    it('shows badge instead of progress bar', () => {
      renderFeatureNode({ state: 'blocked', progress: 20 });
      expect(screen.queryByTestId('feature-node-progress-bar')).not.toBeInTheDocument();
      expect(screen.getByTestId('feature-node-badge')).toBeInTheDocument();
    });

    it('shows "Blocked" when no blockedBy provided', () => {
      renderFeatureNode({ state: 'blocked', progress: 20 });
      expect(screen.getByText('Blocked')).toBeInTheDocument();
    });

    it('shows blockedBy feature when provided', () => {
      renderFeatureNode({ state: 'blocked', progress: 20, blockedBy: 'Auth Module' });
      expect(screen.getByText('Waiting on Auth Module')).toBeInTheDocument();
    });
  });

  describe('action-required state', () => {
    it('shows badge instead of progress bar', () => {
      renderFeatureNode({ state: 'action-required', progress: 60 });
      expect(screen.queryByTestId('feature-node-progress-bar')).not.toBeInTheDocument();
      expect(screen.getByTestId('feature-node-badge')).toBeInTheDocument();
    });

    it('shows "User action required" text', () => {
      renderFeatureNode({ state: 'action-required', progress: 60 });
      expect(screen.getByText('User action required')).toBeInTheDocument();
    });
  });

  describe('error state', () => {
    it('shows badge instead of progress bar', () => {
      renderFeatureNode({ state: 'error', progress: 30 });
      expect(screen.queryByTestId('feature-node-progress-bar')).not.toBeInTheDocument();
      expect(screen.getByTestId('feature-node-badge')).toBeInTheDocument();
    });

    it('shows default error message when none provided', () => {
      renderFeatureNode({ state: 'error', progress: 30 });
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    });

    it('shows custom error message when provided', () => {
      renderFeatureNode({ state: 'error', progress: 30, errorMessage: 'Build failed' });
      expect(screen.getByText('Build failed')).toBeInTheDocument();
    });
  });

  describe('selected highlight', () => {
    it('applies ring classes when selected is true', () => {
      renderFeatureNode(undefined, { selected: true });
      const card = screen.getByTestId('feature-node-card');
      expect(card.className).toContain('ring-2');
      expect(card.className).toContain('ring-primary');
    });

    it('does not apply ring classes when selected is false', () => {
      renderFeatureNode(undefined, { selected: false });
      const card = screen.getByTestId('feature-node-card');
      expect(card.className).not.toContain('ring-2');
      expect(card.className).not.toContain('ring-primary');
    });
  });
});
