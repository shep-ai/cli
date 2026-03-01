import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';

const mockReplace = vi.fn();
let mockSearchParams = new URLSearchParams();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn(), replace: mockReplace }),
  useSearchParams: () => mockSearchParams,
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

let capturedCanvasProps: FeaturesCanvasProps;

vi.mock('@/components/features/features-canvas', () => ({
  FeaturesCanvas: (props: FeaturesCanvasProps) => {
    capturedCanvasProps = props;
    return <div data-testid="mock-features-canvas" />;
  },
}));

vi.mock('@/components/features/control-center/control-center-empty-state', () => ({
  ControlCenterEmptyState: () => <div data-testid="mock-empty-state" />,
}));

const repoNode: CanvasNodeType = {
  id: 'repo-1',
  type: 'repositoryNode',
  position: { x: 50, y: 50 },
  data: { name: 'my-repo', repositoryPath: '/home/user/my-repo', id: 'repo-1' },
} as CanvasNodeType;

const featureNode: CanvasNodeType = {
  id: 'feat-1',
  type: 'featureNode',
  position: { x: 100, y: 100 },
  data: {
    name: 'Auth Module',
    description: 'OAuth2 authentication',
    featureId: '#f1',
    lifecycle: 'implementation',
    state: 'running',
    progress: 45,
    repositoryPath: '/home/user/my-repo',
    branch: 'feat/auth-module',
  } as FeatureNodeData,
};

const initialNodes: CanvasNodeType[] = [repoNode, featureNode];

describe('ControlCenterInner with ViewTabs', () => {
  beforeEach(() => {
    mockReplace.mockReset();
    mockSearchParams = new URLSearchParams();
  });

  it('renders ViewTabs with Board and Map tabs', () => {
    render(<ControlCenterInner initialNodes={initialNodes} initialEdges={[]} />);

    expect(screen.getByRole('tab', { name: /board/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /map/i })).toBeInTheDocument();
  });

  it('renders board view when Board tab is active (default)', () => {
    render(<ControlCenterInner initialNodes={initialNodes} initialEdges={[]} />);

    expect(screen.getByTestId('board-view-grid')).toBeInTheDocument();
    expect(screen.queryByTestId('mock-features-canvas')).not.toBeInTheDocument();
  });

  it('renders FeaturesCanvas when Map tab is active', () => {
    mockSearchParams = new URLSearchParams('view=map');

    render(<ControlCenterInner initialNodes={initialNodes} initialEdges={[]} />);

    expect(screen.getByTestId('mock-features-canvas')).toBeInTheDocument();
    expect(screen.queryByTestId('board-view-grid')).not.toBeInTheDocument();
  });

  it('renders ControlCenterDrawer outside of tabs', () => {
    // Render in Map mode so we can interact with the canvas
    mockSearchParams = new URLSearchParams('view=map');

    const { unmount } = render(
      <ControlCenterInner initialNodes={initialNodes} initialEdges={[]} />
    );

    act(() => {
      capturedCanvasProps.onNodeClick?.({} as React.MouseEvent, featureNode);
    });

    // Drawer content should appear (it's rendered outside tabs)
    // Use description which is unique to the drawer (feature name also appears in inspector)
    expect(screen.getByText('OAuth2 authentication')).toBeInTheDocument();

    unmount();
  });

  it('renders empty state when no repositories exist', () => {
    const addRepoNode: CanvasNodeType = {
      id: 'add-repo',
      type: 'addRepositoryNode',
      position: { x: 50, y: 50 },
      data: {},
    } as CanvasNodeType;

    render(<ControlCenterInner initialNodes={[addRepoNode]} initialEdges={[]} />);

    expect(screen.getByTestId('mock-empty-state')).toBeInTheDocument();
    // Should not render tabs in empty state
    expect(screen.queryByRole('tab')).not.toBeInTheDocument();
  });

  it('Map tab passes correct props to FeaturesCanvas', () => {
    mockSearchParams = new URLSearchParams('view=map');

    render(<ControlCenterInner initialNodes={initialNodes} initialEdges={[]} />);

    expect(capturedCanvasProps).toBeDefined();
    expect(capturedCanvasProps.nodes).toBeDefined();
    expect(capturedCanvasProps.edges).toBeDefined();
    expect(capturedCanvasProps.onNodesChange).toBeDefined();
    expect(capturedCanvasProps.onNodeClick).toBeDefined();
    expect(capturedCanvasProps.onPaneClick).toBeDefined();
  });
});
