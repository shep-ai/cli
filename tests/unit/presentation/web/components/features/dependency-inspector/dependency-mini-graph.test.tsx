import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DependencyMiniGraph } from '@/components/features/dependency-inspector/dependency-mini-graph';
import type { FeatureNodeData } from '@/components/common/feature-node';

// Mock next/image for brand icons
vi.mock('next/image', () => ({
  default: (props: Record<string, unknown>) => <img {...props} />,
}));

// Track what props ReactFlow was rendered with
let lastReactFlowProps: Record<string, unknown> = {};

vi.mock('@xyflow/react', () => ({
  ReactFlow: (props: Record<string, unknown>) => {
    lastReactFlowProps = props;
    const nodes = props.nodes as { id: string; data: Record<string, unknown> }[];
    const edges = props.edges as { id: string; source: string; target: string }[];
    return (
      <div data-testid="mock-react-flow">
        {nodes?.map((n) => (
          <div
            key={n.id}
            data-testid={`rf-node-${n.id}`}
            data-node-id={n.id}
            onClick={() => {
              const onNodeClick = props.onNodeClick as
                | ((event: unknown, node: unknown) => void)
                | undefined;
              onNodeClick?.(new MouseEvent('click'), n);
            }}
          >
            {String(n.data.name ?? n.id)}
          </div>
        ))}
        {edges?.map((e) => (
          <div key={e.id} data-testid={`rf-edge-${e.id}`}>
            {e.source} → {e.target}
          </div>
        ))}
      </div>
    );
  },
  ReactFlowProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="mock-react-flow-provider">{children}</div>
  ),
  Background: () => null,
}));

// Mock dagre layout — just return nodes/edges unchanged
vi.mock('@/lib/layout-with-dagre', () => ({
  layoutWithDagre: (nodes: unknown[], edges: unknown[]) => ({ nodes, edges }),
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

describe('DependencyMiniGraph', () => {
  it('renders the selected feature as a node', () => {
    const selected = createFeatureData({ featureId: 'f1', name: 'Selected Feature' });

    render(
      <DependencyMiniGraph selectedFeature={selected} allFeatures={[selected]} parentIdMap={{}} />
    );

    expect(screen.getByTestId('mock-react-flow')).toBeInTheDocument();
    expect(screen.getByTestId('rf-node-f1')).toBeInTheDocument();
    expect(screen.getByText('Selected Feature')).toBeInTheDocument();
  });

  it('renders upstream parent as a node with edge', () => {
    const parent = createFeatureData({ featureId: 'p1', name: 'Parent Feature' });
    const selected = createFeatureData({ featureId: 'f1', name: 'Selected Feature' });
    const parentIdMap = { f1: 'p1' };

    render(
      <DependencyMiniGraph
        selectedFeature={selected}
        allFeatures={[parent, selected]}
        parentIdMap={parentIdMap}
      />
    );

    expect(screen.getByTestId('rf-node-p1')).toBeInTheDocument();
    expect(screen.getByTestId('rf-node-f1')).toBeInTheDocument();
    // Should have an edge from parent to selected
    expect(screen.getByTestId('rf-edge-dep-p1-f1')).toBeInTheDocument();
  });

  it('renders downstream children as nodes with edges', () => {
    const selected = createFeatureData({ featureId: 'f1', name: 'Selected Feature' });
    const child1 = createFeatureData({ featureId: 'c1', name: 'Child One' });
    const child2 = createFeatureData({ featureId: 'c2', name: 'Child Two' });
    const parentIdMap = { c1: 'f1', c2: 'f1' };

    render(
      <DependencyMiniGraph
        selectedFeature={selected}
        allFeatures={[selected, child1, child2]}
        parentIdMap={parentIdMap}
      />
    );

    expect(screen.getByTestId('rf-node-f1')).toBeInTheDocument();
    expect(screen.getByTestId('rf-node-c1')).toBeInTheDocument();
    expect(screen.getByTestId('rf-node-c2')).toBeInTheDocument();
    expect(screen.getByTestId('rf-edge-dep-f1-c1')).toBeInTheDocument();
    expect(screen.getByTestId('rf-edge-dep-f1-c2')).toBeInTheDocument();
  });

  it('clicking a node calls onFeatureSelect', async () => {
    const user = userEvent.setup();
    const onFeatureSelect = vi.fn();
    const selected = createFeatureData({ featureId: 'f1', name: 'Selected Feature' });
    const child = createFeatureData({ featureId: 'c1', name: 'Child Feature' });
    const parentIdMap = { c1: 'f1' };

    render(
      <DependencyMiniGraph
        selectedFeature={selected}
        allFeatures={[selected, child]}
        parentIdMap={parentIdMap}
        onFeatureSelect={onFeatureSelect}
      />
    );

    await user.click(screen.getByTestId('rf-node-c1'));
    expect(onFeatureSelect).toHaveBeenCalledWith('c1');
  });

  it('nodes are not draggable (nodesDraggable=false)', () => {
    const selected = createFeatureData({ featureId: 'f1', name: 'Selected Feature' });

    render(
      <DependencyMiniGraph selectedFeature={selected} allFeatures={[selected]} parentIdMap={{}} />
    );

    expect(lastReactFlowProps.nodesDraggable).toBe(false);
  });

  it('uses its own ReactFlowProvider', () => {
    const selected = createFeatureData({ featureId: 'f1', name: 'Selected Feature' });

    render(
      <DependencyMiniGraph selectedFeature={selected} allFeatures={[selected]} parentIdMap={{}} />
    );

    expect(screen.getByTestId('mock-react-flow-provider')).toBeInTheDocument();
  });

  it('renders with no deps (single node, no edges)', () => {
    const selected = createFeatureData({ featureId: 'f1', name: 'Lone Feature' });

    render(
      <DependencyMiniGraph selectedFeature={selected} allFeatures={[selected]} parentIdMap={{}} />
    );

    expect(screen.getByTestId('rf-node-f1')).toBeInTheDocument();
    // No edges should exist
    expect(screen.queryByTestId(/rf-edge-/)).not.toBeInTheDocument();
  });
});
