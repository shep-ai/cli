import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DependencyInspector } from '@/components/features/dependency-inspector/dependency-inspector';
import type { FeatureNodeData } from '@/components/common/feature-node';

// Mock next/image for brand icons
vi.mock('next/image', () => ({
  default: (props: Record<string, unknown>) => <img {...props} />,
}));

// Mock the mini-graph since it requires ReactFlow
vi.mock('@/components/features/dependency-inspector/dependency-mini-graph', () => ({
  DependencyMiniGraph: (props: Record<string, unknown>) => (
    <div
      data-testid="mock-mini-graph"
      data-selected-id={(props.selectedFeature as FeatureNodeData).featureId}
    />
  ),
}));

function createFeatureData(overrides: Partial<FeatureNodeData> = {}): FeatureNodeData {
  return {
    name: 'Test Feature',
    description: 'A test feature',
    featureId: 'feat-123',
    lifecycle: 'implementation',
    state: 'running',
    progress: 45,
    repositoryPath: '/repo/path',
    branch: 'feat/test',
    ...overrides,
  };
}

beforeEach(() => {
  vi.mocked(localStorage.getItem).mockReturnValue(null);
  vi.mocked(localStorage.setItem).mockClear();
});

describe('DependencyInspector', () => {
  it('renders when a feature is selected', () => {
    const selected = createFeatureData({ featureId: 'f1', name: 'My Feature' });

    render(
      <DependencyInspector selectedFeature={selected} allFeatures={[selected]} parentIdMap={{}} />
    );

    expect(screen.getByTestId('dependency-inspector')).toBeInTheDocument();
    expect(screen.getByText('My Feature')).toBeInTheDocument();
  });

  it('is hidden when no feature is selected', () => {
    render(<DependencyInspector selectedFeature={null} allFeatures={[]} parentIdMap={{}} />);

    expect(screen.queryByTestId('dependency-inspector')).not.toBeInTheDocument();
  });

  it('toggle button collapses panel', async () => {
    const user = userEvent.setup();
    const selected = createFeatureData({ featureId: 'f1', name: 'My Feature' });

    render(
      <DependencyInspector selectedFeature={selected} allFeatures={[selected]} parentIdMap={{}} />
    );

    const toggleBtn = screen.getByLabelText('Collapse inspector');
    await user.click(toggleBtn);

    // After collapse, the panel content should be hidden
    expect(screen.queryByText('My Feature')).not.toBeVisible();
  });

  it('collapsed state persists to localStorage', async () => {
    const user = userEvent.setup();
    const selected = createFeatureData({ featureId: 'f1', name: 'My Feature' });

    render(
      <DependencyInspector selectedFeature={selected} allFeatures={[selected]} parentIdMap={{}} />
    );

    const toggleBtn = screen.getByLabelText('Collapse inspector');
    await user.click(toggleBtn);

    expect(localStorage.setItem).toHaveBeenCalledWith('shep:inspector-collapsed', 'true');
  });

  it('reads collapsed state from localStorage on mount', () => {
    vi.mocked(localStorage.getItem).mockReturnValue('true');
    const selected = createFeatureData({ featureId: 'f1', name: 'My Feature' });

    render(
      <DependencyInspector selectedFeature={selected} allFeatures={[selected]} parentIdMap={{}} />
    );

    // Panel should be collapsed (content not visible)
    expect(screen.queryByText('My Feature')).not.toBeVisible();
  });

  it('shows upstream and downstream dependency lists', () => {
    const parent = createFeatureData({ featureId: 'p1', name: 'Parent Feature', state: 'done' });
    const selected = createFeatureData({ featureId: 'f1', name: 'Selected Feature' });
    const child = createFeatureData({ featureId: 'c1', name: 'Child Feature', state: 'blocked' });
    const parentIdMap = { f1: 'p1', c1: 'f1' };

    render(
      <DependencyInspector
        selectedFeature={selected}
        allFeatures={[parent, selected, child]}
        parentIdMap={parentIdMap}
      />
    );

    expect(screen.getByText('Blocked by')).toBeInTheDocument();
    expect(screen.getByText('Parent Feature')).toBeInTheDocument();
    expect(screen.getByText('Blocks')).toBeInTheDocument();
    expect(screen.getByText('Child Feature')).toBeInTheDocument();
  });

  it('shows the mini-graph', () => {
    const selected = createFeatureData({ featureId: 'f1', name: 'My Feature' });

    render(
      <DependencyInspector selectedFeature={selected} allFeatures={[selected]} parentIdMap={{}} />
    );

    expect(screen.getByTestId('mock-mini-graph')).toBeInTheDocument();
  });

  it('calls onFeatureSelect when a dependency is clicked', async () => {
    const user = userEvent.setup();
    const onFeatureSelect = vi.fn();
    const parent = createFeatureData({ featureId: 'p1', name: 'Parent Feature', state: 'done' });
    const selected = createFeatureData({ featureId: 'f1', name: 'Selected Feature' });
    const parentIdMap = { f1: 'p1' };

    render(
      <DependencyInspector
        selectedFeature={selected}
        allFeatures={[parent, selected]}
        parentIdMap={parentIdMap}
        onFeatureSelect={onFeatureSelect}
      />
    );

    await user.click(screen.getByText('Parent Feature'));
    expect(onFeatureSelect).toHaveBeenCalledWith('p1');
  });

  it('expand button shows after collapsing', async () => {
    const user = userEvent.setup();
    const selected = createFeatureData({ featureId: 'f1', name: 'My Feature' });

    render(
      <DependencyInspector selectedFeature={selected} allFeatures={[selected]} parentIdMap={{}} />
    );

    const collapseBtn = screen.getByLabelText('Collapse inspector');
    await user.click(collapseBtn);

    expect(screen.getByLabelText('Expand inspector')).toBeInTheDocument();
  });
});
