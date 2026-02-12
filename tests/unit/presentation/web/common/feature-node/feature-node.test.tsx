import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ReactFlowProvider } from '@xyflow/react';
import { FeatureNode } from '@/components/common/feature-node';
import type { FeatureNodeData } from '@/components/common/feature-node';

const defaultData: FeatureNodeData = {
  name: 'Auth Module',
  description: 'Implement authentication flow',
  featureId: '#f1',
  lifecycle: 'requirements',
  state: 'running',
  progress: 45,
};

function renderFeatureNode(dataOverrides?: Partial<FeatureNodeData>) {
  const data = { ...defaultData, ...dataOverrides };
  return render(
    <ReactFlowProvider>
      <FeatureNode id="test-node" type="featureNode" data={data} />
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

  it('renders progress percentage', () => {
    renderFeatureNode({ progress: 45 });
    expect(screen.getByText('45%')).toBeInTheDocument();
  });

  it('renders progress bar', () => {
    renderFeatureNode({ progress: 60 });
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

  it('renders Handle components', () => {
    const { container } = renderFeatureNode();
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
});
