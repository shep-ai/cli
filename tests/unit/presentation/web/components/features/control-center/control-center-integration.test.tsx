import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act, fireEvent, waitFor } from '@testing-library/react';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

vi.mock('@/hooks/agent-events-provider', () => ({
  useAgentEventsContext: () => ({
    events: [],
    lastEvent: null,
    connectionStatus: 'connected' as const,
  }),
}));

const mockGetMergeReviewData = vi.fn();
vi.mock('@/app/actions/get-merge-review-data', () => ({
  getMergeReviewData: (...args: unknown[]) => mockGetMergeReviewData(...args),
}));

const mockApproveFeature = vi.fn();
vi.mock('@/app/actions/approve-feature', () => ({
  approveFeature: (...args: unknown[]) => mockApproveFeature(...args),
}));

import { ReactFlowProvider } from '@xyflow/react';
import { ControlCenterInner } from '@/components/features/control-center/control-center-inner';
import type { FeaturesCanvasProps } from '@/components/features/features-canvas';
import type { CanvasNodeType } from '@/components/features/features-canvas';
import { featureNodeStateConfig } from '@/components/common/feature-node';
import type { FeatureNodeData } from '@/components/common/feature-node';
import type { MergeReviewData } from '@/components/common/merge-review';
import { PrStatus, CiStatus } from '@shepai/core/domain/generated/output';

// Capture FeaturesCanvas props so we can invoke callbacks (onNodeClick, onPaneClick)
// without requiring ReactFlow to render interactive nodes in jsdom.
let capturedCanvasProps: FeaturesCanvasProps;

vi.mock('@/components/features/features-canvas', () => ({
  FeaturesCanvas: (props: FeaturesCanvasProps) => {
    capturedCanvasProps = props;
    return <div data-testid="mock-features-canvas" />;
  },
}));

// Mock the ControlCenterEmptyState since it's irrelevant for these tests
vi.mock('@/components/features/control-center/control-center-empty-state', () => ({
  ControlCenterEmptyState: () => <div data-testid="mock-empty-state" />,
}));

const featureNodeA: CanvasNodeType = {
  id: 'feature-a',
  type: 'featureNode',
  position: { x: 100, y: 100 },
  data: {
    name: 'Auth Module',
    description: 'OAuth2 authentication',
    featureId: '#fa01',
    lifecycle: 'implementation',
    state: 'running',
    progress: 45,
    agentType: 'claude-code',
    repositoryPath: '/home/user/my-repo',
    branch: 'feat/auth-module',
  } as FeatureNodeData,
};

const featureNodeB: CanvasNodeType = {
  id: 'feature-b',
  type: 'featureNode',
  position: { x: 100, y: 300 },
  data: {
    name: 'Payment Gateway',
    description: 'Stripe integration',
    featureId: '#fb02',
    lifecycle: 'research',
    state: 'action-required',
    progress: 80,
    repositoryPath: '/home/user/my-repo',
    branch: 'feat/payment-gateway',
  } as FeatureNodeData,
};

const repoNodeDefault: CanvasNodeType = {
  id: 'repo-default',
  type: 'repositoryNode',
  position: { x: 50, y: 50 },
  data: { name: 'my-repo', repositoryPath: '/home/user/my-repo', id: 'repo-default' },
} as CanvasNodeType;

const mergeReviewNode: CanvasNodeType = {
  id: 'feature-merge',
  type: 'featureNode',
  position: { x: 100, y: 500 },
  data: {
    name: 'Merge Review Feature',
    description: 'Feature awaiting merge approval',
    featureId: '#fm01',
    lifecycle: 'review',
    state: 'action-required',
    progress: 90,
    repositoryPath: '/home/user/my-repo',
    branch: 'feat/merge-review',
  } as FeatureNodeData,
};

const initialNodes: CanvasNodeType[] = [repoNodeDefault, featureNodeA, featureNodeB];

function renderControlCenter(nodes = initialNodes) {
  return render(
    <ReactFlowProvider>
      <ControlCenterInner initialNodes={nodes} initialEdges={[]} />
    </ReactFlowProvider>
  );
}

const mergeReviewDataFixture: MergeReviewData = {
  pr: {
    url: 'https://github.com/shep-ai/cli/pull/42',
    number: 42,
    status: PrStatus.Open,
    commitHash: 'a1b2c3d',
    ciStatus: CiStatus.Success,
  },
  diffSummary: { filesChanged: 5, additions: 100, deletions: 30, commitCount: 3 },
};

describe('ControlCenterInner + FeatureDrawer integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: server actions return a valid response so tests that don't
    // care about the merge drawer aren't broken by unresolved promises.
    mockGetMergeReviewData.mockResolvedValue(mergeReviewDataFixture);
    mockApproveFeature.mockResolvedValue({ approved: true });
  });

  describe('drawer opens on node click', () => {
    it('opens the drawer displaying the clicked feature name', () => {
      renderControlCenter();

      // Drawer should be closed initially
      expect(screen.queryByText('Auth Module')).not.toBeInTheDocument();

      // Simulate clicking feature node A via the captured onNodeClick callback
      act(() => {
        capturedCanvasProps.onNodeClick?.({} as React.MouseEvent, featureNodeA);
      });

      // Drawer should now show the feature name
      expect(screen.getByText('Auth Module')).toBeInTheDocument();
      expect(screen.getByText('#fa01')).toBeInTheDocument();
    });

    it('displays the correct state badge for the selected node', () => {
      renderControlCenter();

      act(() => {
        capturedCanvasProps.onNodeClick?.({} as React.MouseEvent, featureNodeA);
      });

      expect(screen.getByText(featureNodeStateConfig.running.label)).toBeInTheDocument();
    });

    it('displays the correct lifecycle label for the selected node', () => {
      renderControlCenter();

      act(() => {
        capturedCanvasProps.onNodeClick?.({} as React.MouseEvent, featureNodeB);
      });

      expect(screen.getByText('RESEARCH')).toBeInTheDocument();
    });
  });

  describe('drawer closes on pane click', () => {
    it('closes the drawer when the canvas pane is clicked', () => {
      renderControlCenter();

      // Open the drawer
      act(() => {
        capturedCanvasProps.onNodeClick?.({} as React.MouseEvent, featureNodeA);
      });

      expect(screen.getByText('Auth Module')).toBeInTheDocument();

      // Click the pane to close
      act(() => {
        capturedCanvasProps.onPaneClick?.({} as React.MouseEvent);
      });

      expect(screen.queryByText('Auth Module')).not.toBeInTheDocument();
    });
  });

  describe('drawer closes on Escape key', () => {
    it('closes the drawer when Escape is pressed', () => {
      renderControlCenter();

      // Open the drawer
      act(() => {
        capturedCanvasProps.onNodeClick?.({} as React.MouseEvent, featureNodeA);
      });

      expect(screen.getByText('Auth Module')).toBeInTheDocument();

      // Press Escape
      act(() => {
        fireEvent.keyDown(document, { key: 'Escape' });
      });

      expect(screen.queryByText('Auth Module')).not.toBeInTheDocument();
    });
  });

  describe('drawer content switches on different node click', () => {
    it('switches drawer content in-place when clicking a different feature node', () => {
      renderControlCenter();

      // Open drawer with node A
      act(() => {
        capturedCanvasProps.onNodeClick?.({} as React.MouseEvent, featureNodeA);
      });

      expect(screen.getByText('Auth Module')).toBeInTheDocument();
      expect(screen.getByText('#fa01')).toBeInTheDocument();
      expect(screen.queryByText('Payment Gateway')).not.toBeInTheDocument();

      // Click node B — drawer should switch to node B data
      act(() => {
        capturedCanvasProps.onNodeClick?.({} as React.MouseEvent, featureNodeB);
      });

      expect(screen.getByText('Payment Gateway')).toBeInTheDocument();
      expect(screen.getByText('#fb02')).toBeInTheDocument();
      expect(screen.queryByText('Auth Module')).not.toBeInTheDocument();
    });

    it('updates the state badge when switching to a node with a different state', () => {
      renderControlCenter();

      // Open with running node
      act(() => {
        capturedCanvasProps.onNodeClick?.({} as React.MouseEvent, featureNodeA);
      });

      expect(screen.getByText(featureNodeStateConfig.running.label)).toBeInTheDocument();

      // Switch to action-required node
      act(() => {
        capturedCanvasProps.onNodeClick?.({} as React.MouseEvent, featureNodeB);
      });

      expect(screen.getByText(featureNodeStateConfig['action-required'].label)).toBeInTheDocument();
      expect(screen.queryByText(featureNodeStateConfig.running.label)).not.toBeInTheDocument();
    });
  });

  describe('empty state conditional rendering', () => {
    const addRepoNode: CanvasNodeType = {
      id: 'add-repo',
      type: 'addRepositoryNode',
      position: { x: 50, y: 50 },
      data: {},
    } as CanvasNodeType;

    const repoNode: CanvasNodeType = {
      id: 'repo-1',
      type: 'repositoryNode',
      position: { x: 50, y: 50 },
      data: { name: 'my-repo', repositoryPath: '/home/user/my-repo', id: 'repo-1' },
    } as CanvasNodeType;

    it('renders empty state when only addRepositoryNode exists (no repositories)', () => {
      renderControlCenter([addRepoNode]);

      expect(screen.getByTestId('mock-empty-state')).toBeInTheDocument();
      expect(screen.queryByTestId('mock-features-canvas')).not.toBeInTheDocument();
    });

    it('renders FeaturesCanvas when a repositoryNode exists', () => {
      renderControlCenter([repoNode, addRepoNode]);

      expect(screen.getByTestId('mock-features-canvas')).toBeInTheDocument();
      expect(screen.queryByTestId('mock-empty-state')).not.toBeInTheDocument();
    });
  });

  describe('non-feature nodes are ignored', () => {
    it('does not open the drawer when clicking a non-feature node', () => {
      const repoNode: CanvasNodeType = {
        id: 'repo-1',
        type: 'repositoryNode',
        position: { x: 50, y: 50 },
        data: { name: 'my-repo' },
      } as CanvasNodeType;

      renderControlCenter([repoNode]);

      act(() => {
        capturedCanvasProps.onNodeClick?.({} as React.MouseEvent, repoNode);
      });

      // Drawer should remain closed — no drawer content visible
      expect(screen.queryByTestId('feature-drawer-header')).not.toBeInTheDocument();
    });
  });

  describe('merge review drawer', () => {
    const nodesWithMerge: CanvasNodeType[] = [repoNodeDefault, featureNodeA, mergeReviewNode];

    it('suppresses FeatureDrawer when review + action-required node is selected', async () => {
      renderControlCenter(nodesWithMerge);

      act(() => {
        capturedCanvasProps.onNodeClick?.({} as React.MouseEvent, mergeReviewNode);
      });

      // FeatureDrawer should be suppressed — its unique delete section is absent
      expect(screen.queryByTestId('feature-drawer-delete')).not.toBeInTheDocument();
    });

    it('calls getMergeReviewData when review + action-required node is clicked', async () => {
      renderControlCenter(nodesWithMerge);

      act(() => {
        capturedCanvasProps.onNodeClick?.({} as React.MouseEvent, mergeReviewNode);
      });

      await waitFor(() => {
        expect(mockGetMergeReviewData).toHaveBeenCalledWith('#fm01');
      });
    });

    it('renders MergeReviewDrawer when merge review data is loaded', async () => {
      renderControlCenter(nodesWithMerge);

      act(() => {
        capturedCanvasProps.onNodeClick?.({} as React.MouseEvent, mergeReviewNode);
      });

      // Wait for the merge review content to appear (PR #42 link text)
      await waitFor(() => {
        expect(screen.getByText(/PR #42/)).toBeInTheDocument();
      });
    });

    it('shows success toast and clears selection on merge approve', async () => {
      renderControlCenter(nodesWithMerge);

      act(() => {
        capturedCanvasProps.onNodeClick?.({} as React.MouseEvent, mergeReviewNode);
      });

      // Wait for merge review drawer to render
      await waitFor(() => {
        expect(screen.getByText(/PR #42/)).toBeInTheDocument();
      });

      // Click Approve Merge button
      const approveButton = screen.getByRole('button', { name: /Approve Merge/ });
      await act(async () => {
        fireEvent.click(approveButton);
      });

      expect(mockApproveFeature).toHaveBeenCalledWith('#fm01');
    });

    it('shows error toast when getMergeReviewData returns error', async () => {
      mockGetMergeReviewData.mockResolvedValue({ error: 'Feature not found' });

      renderControlCenter(nodesWithMerge);

      act(() => {
        capturedCanvasProps.onNodeClick?.({} as React.MouseEvent, mergeReviewNode);
      });

      await waitFor(() => {
        expect(mockGetMergeReviewData).toHaveBeenCalledWith('#fm01');
      });

      // MergeReviewDrawer should not render since data is an error
      expect(screen.queryByText(/PR #42/)).not.toBeInTheDocument();
    });
  });
});
