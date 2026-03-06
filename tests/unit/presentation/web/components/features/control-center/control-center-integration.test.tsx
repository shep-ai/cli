import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';

let currentPathname = '/';
const mockPush = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, refresh: vi.fn() }),
  usePathname: () => currentPathname,
}));

vi.mock('@/hooks/agent-events-provider', () => ({
  useAgentEventsContext: () => ({
    events: [],
    lastEvent: null,
    connectionStatus: 'connected' as const,
  }),
}));

vi.mock('@/components/common/notification-permission-banner', () => ({
  NotificationPermissionBanner: () => null,
}));

import { ControlCenterInner } from '@/components/features/control-center/control-center-inner';
import { SidebarFeaturesProvider } from '@/hooks/sidebar-features-context';
import { DrawerCloseGuardProvider } from '@/hooks/drawer-close-guard';
import type { FeaturesCanvasProps } from '@/components/features/features-canvas';
import type { CanvasNodeType } from '@/components/features/features-canvas';
import type { FeatureNodeData } from '@/components/common/feature-node';

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

const initialNodes: CanvasNodeType[] = [repoNodeDefault, featureNodeA, featureNodeB];

function renderControlCenter(nodes = initialNodes) {
  return render(
    <DrawerCloseGuardProvider>
      <SidebarFeaturesProvider>
        <ControlCenterInner initialNodes={nodes} initialEdges={[]} />
      </SidebarFeaturesProvider>
    </DrawerCloseGuardProvider>
  );
}

describe('ControlCenterInner URL-based navigation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentPathname = '/';
  });

  describe('node click navigates to feature route', () => {
    it('navigates to /feature/<id> when a feature node is clicked', () => {
      renderControlCenter();

      act(() => {
        capturedCanvasProps.onNodeClick?.({} as React.MouseEvent, featureNodeA);
      });

      expect(mockPush).toHaveBeenCalledWith('/feature/#fa01');
    });

    it('navigates to a different feature route when clicking another node', () => {
      renderControlCenter();

      act(() => {
        capturedCanvasProps.onNodeClick?.({} as React.MouseEvent, featureNodeB);
      });

      expect(mockPush).toHaveBeenCalledWith('/feature/#fb02');
    });
  });

  describe('pane click navigates to root', () => {
    it('navigates to / when the canvas pane is clicked and a drawer route is active', () => {
      currentPathname = '/feature/#fa01';
      renderControlCenter();

      act(() => {
        capturedCanvasProps.onPaneClick?.({} as React.MouseEvent);
      });

      expect(mockPush).toHaveBeenCalledWith('/');
    });

    it('does not navigate when pane is clicked and already at root', () => {
      currentPathname = '/';
      renderControlCenter();

      act(() => {
        capturedCanvasProps.onPaneClick?.({} as React.MouseEvent);
      });

      expect(mockPush).not.toHaveBeenCalled();
    });
  });

  describe('empty state conditional rendering', () => {
    const repoNode: CanvasNodeType = {
      id: 'repo-1',
      type: 'repositoryNode',
      position: { x: 50, y: 50 },
      data: { name: 'my-repo', repositoryPath: '/home/user/my-repo', id: 'repo-1' },
    } as CanvasNodeType;

    it('renders empty state when no nodes exist', () => {
      renderControlCenter([]);

      expect(screen.getByTestId('mock-empty-state')).toBeInTheDocument();
      expect(screen.queryByTestId('mock-features-canvas')).not.toBeInTheDocument();
    });

    it('renders FeaturesCanvas when a repositoryNode exists', () => {
      renderControlCenter([repoNode]);

      expect(screen.getByTestId('mock-features-canvas')).toBeInTheDocument();
      expect(screen.queryByTestId('mock-empty-state')).not.toBeInTheDocument();
    });
  });

  describe('non-feature nodes are ignored', () => {
    it('does not navigate when clicking a non-feature node', () => {
      const repoNode: CanvasNodeType = {
        id: 'repo-1',
        type: 'repositoryNode',
        position: { x: 50, y: 50 },
        data: { name: 'my-repo', repositoryPath: '/home/user/my-repo', id: 'repo-1' },
      } as CanvasNodeType;

      renderControlCenter([repoNode]);

      act(() => {
        capturedCanvasProps.onNodeClick?.({} as React.MouseEvent, repoNode);
      });

      expect(mockPush).not.toHaveBeenCalled();
    });
  });

  describe('selectedFeatureId is passed to canvas', () => {
    it('passes feature ID from URL to FeaturesCanvas', () => {
      currentPathname = '/feature/#fa01';
      renderControlCenter();

      expect(capturedCanvasProps.selectedFeatureId).toBe('#fa01');
    });

    it('passes null when no feature route is active', () => {
      currentPathname = '/';
      renderControlCenter();

      expect(capturedCanvasProps.selectedFeatureId).toBeNull();
    });
  });
});
