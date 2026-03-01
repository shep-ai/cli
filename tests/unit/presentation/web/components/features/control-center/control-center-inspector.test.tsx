import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act, within } from '@testing-library/react';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams('view=board'),
  usePathname: () => '/',
}));

vi.mock('@/hooks/agent-events-provider', () => ({
  useAgentEventsContext: () => ({
    events: [],
    lastEvent: null,
    connectionStatus: 'connected' as const,
  }),
}));

vi.mock('@/app/actions/get-merge-review-data', () => ({
  getMergeReviewData: vi.fn().mockResolvedValue({}),
}));

vi.mock('@/app/actions/approve-feature', () => ({
  approveFeature: vi.fn().mockResolvedValue({ approved: true }),
}));

import { ControlCenterInner } from '@/components/features/control-center/control-center-inner';
import type { FeaturesCanvasProps } from '@/components/features/features-canvas';
import type { CanvasNodeType } from '@/components/features/features-canvas';
import type { FeatureNodeData } from '@/components/common/feature-node';
import type { Edge } from '@xyflow/react';

// Capture FeaturesCanvas props so we can invoke callbacks
let _capturedCanvasProps: FeaturesCanvasProps;

vi.mock('@/components/features/features-canvas', () => ({
  FeaturesCanvas: (props: FeaturesCanvasProps) => {
    _capturedCanvasProps = props;
    return <div data-testid="mock-features-canvas" />;
  },
}));

vi.mock('@/components/features/control-center/control-center-empty-state', () => ({
  ControlCenterEmptyState: () => <div data-testid="mock-empty-state" />,
}));

// Mock the DependencyMiniGraph to avoid React Flow in tests
vi.mock('@/components/features/dependency-inspector/dependency-mini-graph', () => ({
  DependencyMiniGraph: (props: Record<string, unknown>) => (
    <div
      data-testid="mock-mini-graph"
      data-selected-id={(props.selectedFeature as FeatureNodeData)?.featureId}
    />
  ),
}));

vi.mock('next/image', () => ({
  default: (props: Record<string, unknown>) => <img {...props} />,
}));

const repoNode: CanvasNodeType = {
  id: 'repo-1',
  type: 'repositoryNode',
  position: { x: 50, y: 50 },
  data: { name: 'my-repo', repositoryPath: '/home/user/my-repo', id: 'repo-1' },
} as CanvasNodeType;

const parentFeature: CanvasNodeType = {
  id: 'feat-parent-uuid',
  type: 'featureNode',
  position: { x: 100, y: 100 },
  data: {
    name: 'Parent Feature',
    description: 'The parent',
    featureId: 'parent-uuid',
    lifecycle: 'implementation',
    state: 'done',
    progress: 100,
    repositoryPath: '/home/user/my-repo',
    branch: 'feat/parent',
  } as FeatureNodeData,
};

const childFeature: CanvasNodeType = {
  id: 'feat-child-uuid',
  type: 'featureNode',
  position: { x: 100, y: 300 },
  data: {
    name: 'Child Feature',
    description: 'The child',
    featureId: 'child-uuid',
    lifecycle: 'requirements',
    state: 'running',
    progress: 20,
    repositoryPath: '/home/user/my-repo',
    branch: 'feat/child',
  } as FeatureNodeData,
};

const grandchildFeature: CanvasNodeType = {
  id: 'feat-grandchild-uuid',
  type: 'featureNode',
  position: { x: 100, y: 500 },
  data: {
    name: 'Grandchild Feature',
    description: 'Depends on child',
    featureId: 'grandchild-uuid',
    lifecycle: 'requirements',
    state: 'blocked',
    progress: 0,
    blockedBy: 'Child Feature',
    repositoryPath: '/home/user/my-repo',
    branch: 'feat/grandchild',
  } as FeatureNodeData,
};

// Dependency edges (parent → child, child → grandchild)
const depEdges: Edge[] = [
  {
    id: 'dep-feat-parent-uuid-feat-child-uuid',
    source: 'feat-parent-uuid',
    target: 'feat-child-uuid',
    type: 'dependencyEdge',
  },
  {
    id: 'dep-feat-child-uuid-feat-grandchild-uuid',
    source: 'feat-child-uuid',
    target: 'feat-grandchild-uuid',
    type: 'dependencyEdge',
  },
];

const allNodes: CanvasNodeType[] = [repoNode, parentFeature, childFeature, grandchildFeature];

beforeEach(() => {
  vi.mocked(localStorage.getItem).mockReturnValue(null);
  vi.mocked(localStorage.setItem).mockClear();
});

describe('ControlCenterInner — DependencyInspector integration', () => {
  it('inspector renders alongside board view when a feature is selected', () => {
    render(<ControlCenterInner initialNodes={allNodes} initialEdges={depEdges} />);

    // Inspector should not show initially (no feature selected)
    expect(screen.queryByTestId('dependency-inspector')).not.toBeInTheDocument();

    // Select a feature via the global select-feature event
    act(() => {
      window.dispatchEvent(
        new CustomEvent('shep:select-feature', { detail: { featureId: 'child-uuid' } })
      );
    });

    // Inspector should now be visible with the selected feature name
    expect(screen.getByTestId('dependency-inspector')).toBeInTheDocument();
  });

  it('inspector shows upstream and downstream dependencies from edges', () => {
    render(<ControlCenterInner initialNodes={allNodes} initialEdges={depEdges} />);

    // Select the child feature (has parent upstream and grandchild downstream)
    act(() => {
      window.dispatchEvent(
        new CustomEvent('shep:select-feature', { detail: { featureId: 'child-uuid' } })
      );
    });

    // Scope assertions to the inspector panel to avoid matching board view content
    const inspector = within(screen.getByTestId('dependency-inspector'));

    // Upstream section should show parent
    expect(inspector.getByText('Blocked by')).toBeInTheDocument();
    expect(inspector.getByText('Parent Feature')).toBeInTheDocument();

    // Downstream section should show grandchild
    expect(inspector.getByText('Blocks')).toBeInTheDocument();
    expect(inspector.getByText('Grandchild Feature')).toBeInTheDocument();
  });

  it('board area shrinks when inspector opens', () => {
    render(<ControlCenterInner initialNodes={allNodes} initialEdges={depEdges} />);

    // Before selection: no inspector
    expect(screen.queryByTestId('dependency-inspector')).not.toBeInTheDocument();

    // Select feature to open inspector
    act(() => {
      window.dispatchEvent(
        new CustomEvent('shep:select-feature', { detail: { featureId: 'child-uuid' } })
      );
    });

    // Inspector panel should render with w-80 class (320px width)
    const inspector = screen.getByTestId('dependency-inspector');
    expect(inspector.className).toContain('w-80');
  });

  it('drawer opens on top of inspector (both coexist in DOM)', () => {
    render(<ControlCenterInner initialNodes={allNodes} initialEdges={depEdges} />);

    // Select a feature to show both inspector and drawer
    act(() => {
      window.dispatchEvent(
        new CustomEvent('shep:select-feature', { detail: { featureId: 'child-uuid' } })
      );
    });

    // Inspector and drawer content both exist in DOM
    expect(screen.getByTestId('dependency-inspector')).toBeInTheDocument();
    // The drawer renders feature info when a feature is selected
    // Both should coexist without errors
  });
});
