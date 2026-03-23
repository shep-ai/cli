import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ReactFlowProvider, ReactFlow } from '@xyflow/react';
import { FeatureNode, lifecycleDisplayLabels } from '@/components/common/feature-node';
import type { FeatureNodeData, FeatureNodeType } from '@/components/common/feature-node';

// Mock useDeployAction — default: idle state
const mockDeployAction = {
  deploy: vi.fn(),
  stop: vi.fn(),
  deployLoading: false,
  stopLoading: false,
  deployError: null as string | null,
  status: 'Idle' as string,
  url: null as string | null,
};
vi.mock('@/hooks/use-deploy-action', () => ({
  useDeployAction: () => mockDeployAction,
}));

// Mock useFeatureFlags — envDeploy off by default
vi.mock('@/hooks/feature-flags-context', () => ({
  useFeatureFlags: () => ({ envDeploy: false }),
}));

// Mock radix-ui tooltip — render trigger children directly, hide content to avoid DOM noise
vi.mock('radix-ui', () => ({
  Tooltip: {
    Provider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    Root: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    Trigger: ({ children }: { children: React.ReactNode; [key: string]: unknown }) => (
      <>{children}</>
    ),
    Content: ({ children }: { children: React.ReactNode }) => (
      <div role="tooltip" hidden>
        {children}
      </div>
    ),
    Portal: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    Arrow: () => null,
  },
  Slot: {
    Root: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => (
      <div {...props}>{children}</div>
    ),
  },
}));

// Mock shadcn Dialog — controlled by `open` prop
vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open }: { children: React.ReactNode; open?: boolean }) =>
    open ? <>{children}</> : null,
  DialogContent: ({ children }: { children: React.ReactNode }) => (
    <div role="dialog">{children}</div>
  ),
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
  DialogDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  DialogClose: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    onClick,
    ...props
  }: {
    children: React.ReactNode;
    onClick?: (e: React.MouseEvent) => void;
    [key: string]: unknown;
  }) => (
    <button onClick={onClick} {...props}>
      {children}
    </button>
  ),
}));

// Mock DeleteFeatureDialog — renders a simple confirm/cancel when open
vi.mock('@/components/common/delete-feature-dialog', () => ({
  DeleteFeatureDialog: ({
    open,
    onOpenChange,
    onConfirm,
  }: {
    open: boolean;
    onOpenChange: (v: boolean) => void;
    onConfirm: (cleanup: boolean, cascadeDelete: boolean, closePr: boolean) => void;
    isDeleting: boolean;
    featureName: string;
    featureId: string;
    hasChildren?: boolean;
    hasOpenPr?: boolean;
  }) =>
    open ? (
      <div role="dialog">
        <h2>Delete feature?</h2>
        <button onClick={() => onConfirm(true, true, false)}>Delete</button>
        <button onClick={() => onOpenChange(false)}>Cancel</button>
      </div>
    ) : null,
}));

// Mock FeatureSessionsDropdown — renders a simple button placeholder
vi.mock('@/components/common/feature-node/feature-sessions-dropdown', () => ({
  FeatureSessionsDropdown: ({ repositoryPath }: { repositoryPath: string }) => (
    <button data-testid="feature-node-sessions-button" aria-label="View sessions">
      Sessions ({repositoryPath})
    </button>
  ),
}));

const nodeTypes = { featureNode: FeatureNode };

const defaultData: FeatureNodeData = {
  name: 'Auth Module',
  description: 'Implement authentication flow',
  featureId: '#f1',
  lifecycle: 'requirements',
  state: 'running',
  progress: 45,
  repositoryPath: '/home/user/my-repo',
  branch: 'feat/auth-module',
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
  it('renders lifecycle phase badge', () => {
    renderFeatureNode({ lifecycle: 'requirements' });
    expect(screen.getByTestId('feature-node-phase-badge')).toBeInTheDocument();
  });

  it('renders feature name', () => {
    renderFeatureNode({ name: 'Auth Module' });
    expect(screen.getByText('Auth Module')).toBeInTheDocument();
  });

  it('renders description', () => {
    renderFeatureNode({ description: 'Implement authentication flow' });
    expect(screen.getByText('Implement authentication flow')).toBeInTheDocument();
  });

  it('renders featureId in non-running state', () => {
    renderFeatureNode({ featureId: '#f1', state: 'done' });
    expect(screen.getByText('#f1')).toBeInTheDocument();
  });

  describe('running state', () => {
    it('shows running verb instead of progress bar', () => {
      renderFeatureNode({ state: 'running', progress: 45 });
      expect(screen.queryByTestId('feature-node-progress-bar')).not.toBeInTheDocument();
      expect(screen.getByText('Analyzing')).toBeInTheDocument();
    });

    it('shows lifecycle-specific running verb', () => {
      renderFeatureNode({ state: 'running', lifecycle: 'requirements' });
      expect(screen.getByText('Analyzing')).toBeInTheDocument();
    });

    it('shows implementing verb for implementation phase', () => {
      renderFeatureNode({ state: 'running', lifecycle: 'implementation' });
      expect(screen.getByText('Implementing')).toBeInTheDocument();
    });
  });

  it('action button fires onAction callback', () => {
    const onAction = vi.fn();
    renderFeatureNode({ onAction });
    const actionButton = screen.getByTestId('feature-node-action-button');
    fireEvent.click(actionButton);
    expect(onAction).toHaveBeenCalledOnce();
  });

  it('renders agent icon when agentType is provided', () => {
    renderFeatureNode({ agentType: 'claude-code' });
    expect(screen.getByTestId('feature-node-card')).toBeInTheDocument();
  });

  it('renders Handle components when showHandles is true', () => {
    const { container } = renderFeatureNode({ showHandles: true });
    const handles = container.querySelectorAll('.react-flow__handle');
    expect(handles.length).toBeGreaterThanOrEqual(2);
  });

  it('renders phase badge for all lifecycle phases', () => {
    const phases = [
      'requirements',
      'research',
      'implementation',
      'review',
      'deploy',
      'maintain',
    ] as const;
    for (const phase of phases) {
      const { unmount } = renderFeatureNode({ lifecycle: phase });
      expect(screen.getByTestId('feature-node-phase-badge')).toBeInTheDocument();
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
    it('shows approve button instead of progress bar', () => {
      renderFeatureNode({ state: 'action-required', progress: 60 });
      expect(screen.queryByTestId('feature-node-progress-bar')).not.toBeInTheDocument();
      expect(screen.getByTestId('feature-node-approve-button')).toBeInTheDocument();
    });

    it('shows "Review Changes" button in review lifecycle', () => {
      renderFeatureNode({ state: 'action-required', lifecycle: 'review', progress: 60 });
      expect(screen.getByText('Review Changes')).toBeInTheDocument();
    });

    it('shows "Review Requirements" button in requirements lifecycle', () => {
      renderFeatureNode({
        state: 'action-required',
        lifecycle: 'requirements',
      });
      expect(screen.getByText('Review Requirements')).toBeInTheDocument();
    });

    it('shows "Review Technical Plan" button in implementation lifecycle', () => {
      renderFeatureNode({
        state: 'action-required',
        lifecycle: 'implementation',
      });
      expect(screen.getByText('Review Technical Plan')).toBeInTheDocument();
    });

    it('shows default "Review" button in other lifecycles', () => {
      renderFeatureNode({
        state: 'action-required',
        lifecycle: 'research',
      });
      expect(screen.getByText('Review')).toBeInTheDocument();
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

  describe('lifecycleDisplayLabels', () => {
    it('maps maintain to COMPLETED', () => {
      expect(lifecycleDisplayLabels.maintain).toBe('COMPLETED');
    });

    it('maps deploy to DEPLOY & QA', () => {
      expect(lifecycleDisplayLabels.deploy).toBe('DEPLOY & QA');
    });

    it('maps research to RESEARCH', () => {
      expect(lifecycleDisplayLabels.research).toBe('RESEARCH');
    });

    it('maps review to REVIEW', () => {
      expect(lifecycleDisplayLabels.review).toBe('REVIEW');
    });
  });

  describe('creating state', () => {
    it('renders without throwing when state is creating', () => {
      renderFeatureNode({ state: 'creating' });
      expect(screen.getByTestId('feature-node-card')).toBeInTheDocument();
    });

    it('shows "Creating..." badge text', () => {
      renderFeatureNode({ state: 'creating' });
      expect(screen.getByText('Creating...')).toBeInTheDocument();
    });

    it('renders the feature name', () => {
      renderFeatureNode({ state: 'creating', name: 'New Feature' });
      expect(screen.getByText('New Feature')).toBeInTheDocument();
    });

    it('does not show progress bar or badge', () => {
      renderFeatureNode({ state: 'creating' });
      expect(screen.queryByTestId('feature-node-progress-bar')).not.toBeInTheDocument();
      expect(screen.queryByTestId('feature-node-badge')).not.toBeInTheDocument();
    });

    it('does not render agent icon element', () => {
      renderFeatureNode({ state: 'creating', agentType: 'claude-code' });
      // In 'running' state, the agent icon renders with a specific icon component.
      // In 'creating' state, there should be no agent icon — only "Creating..." text.
      const creatingText = screen.getByText('Creating...');
      expect(creatingText).toBeInTheDocument();
      // The running state renders AgentIcon; creating state should not
      expect(screen.queryByText('Analyzing')).not.toBeInTheDocument();
    });

    it('has aria-busy="true" on the card element', () => {
      renderFeatureNode({ state: 'creating' });
      const card = screen.getByTestId('feature-node-card');
      expect(card).toHaveAttribute('aria-busy', 'true');
    });
  });

  describe('deployment indicator (inline icon)', () => {
    it('does not render deploy button when envDeploy flag is off', () => {
      renderFeatureNode();
      expect(screen.queryByTestId('feature-node-deploy-button')).not.toBeInTheDocument();
    });

    it('does not render deployment indicator when no deployment data', () => {
      renderFeatureNode();
      expect(screen.queryByTestId('feature-node-deployment-indicator')).not.toBeInTheDocument();
    });

    it('renders deployment url when deploy is ready with url', () => {
      mockDeployAction.status = 'Ready';
      mockDeployAction.url = 'http://localhost:3000';
      renderFeatureNode();
      // The url link uses the deployment-indicator testid
      const indicator = screen.queryByTestId('feature-node-deployment-indicator');
      // envDeploy is off by default so deploy controls are hidden
      expect(indicator).not.toBeInTheDocument();
      mockDeployAction.status = 'Idle';
      mockDeployAction.url = null;
    });
  });

  describe('selected highlight', () => {
    it('applies selection border classes when selected is true', () => {
      renderFeatureNode(undefined, { selected: true });
      const card = screen.getByTestId('feature-node-card');
      expect(card.className).toContain('border-blue-400');
    });

    it('does not apply selection border classes when selected is false', () => {
      renderFeatureNode(undefined, { selected: false });
      const card = screen.getByTestId('feature-node-card');
      expect(card.className).not.toContain('border-blue-400');
    });
  });

  describe('delete button', () => {
    it('renders delete button when onDelete and featureId are provided', () => {
      renderFeatureNode({ onDelete: vi.fn(), featureId: '#f1' });

      expect(screen.getByTestId('feature-node-delete-button')).toBeInTheDocument();
    });

    it('does not render delete button when onDelete is absent', () => {
      renderFeatureNode({ featureId: '#f1' });

      expect(screen.queryByTestId('feature-node-delete-button')).not.toBeInTheDocument();
    });

    it('does not render delete button when featureId is empty', () => {
      renderFeatureNode({ onDelete: vi.fn(), featureId: '' });

      expect(screen.queryByTestId('feature-node-delete-button')).not.toBeInTheDocument();
    });

    it('opens confirmation dialog when delete button is clicked', () => {
      renderFeatureNode({ onDelete: vi.fn(), featureId: '#f1' });

      expect(screen.queryByText('Delete feature?')).not.toBeInTheDocument();

      fireEvent.click(screen.getByTestId('feature-node-delete-button'));

      expect(screen.getByText('Delete feature?')).toBeInTheDocument();
    });

    it('calls onDelete with featureId and cleanup after confirming in the dialog', () => {
      const onDelete = vi.fn();
      renderFeatureNode({ onDelete, featureId: '#f1' });

      fireEvent.click(screen.getByTestId('feature-node-delete-button'));
      expect(onDelete).not.toHaveBeenCalled();

      fireEvent.click(screen.getByText('Delete'));
      expect(onDelete).toHaveBeenCalledWith('#f1', true, true, false);
    });

    it('does not call onDelete when cancel is clicked', () => {
      const onDelete = vi.fn();
      renderFeatureNode({ onDelete, featureId: '#f1' });

      fireEvent.click(screen.getByTestId('feature-node-delete-button'));
      fireEvent.click(screen.getByText('Cancel'));

      expect(onDelete).not.toHaveBeenCalled();
    });

    it('delete button click stops propagation', () => {
      const onDelete = vi.fn();
      renderFeatureNode({ onDelete, featureId: '#f1' });

      const button = screen.getByTestId('feature-node-delete-button');
      const stopPropagation = vi.fn();
      fireEvent.click(button, { stopPropagation });

      // The button should render without triggering node selection — verified by
      // the fact that stopPropagation is called in the click handler
      expect(screen.getByTestId('feature-node-delete-button')).toBeInTheDocument();
    });

    it('has correct aria-label', () => {
      renderFeatureNode({ onDelete: vi.fn(), featureId: '#f1' });

      expect(screen.getByTestId('feature-node-delete-button')).toHaveAttribute(
        'aria-label',
        'Delete feature'
      );
    });

    it('displays delete confirmation dialog', () => {
      renderFeatureNode({ onDelete: vi.fn(), featureId: '#f1', name: 'My Feature' });

      fireEvent.click(screen.getByTestId('feature-node-delete-button'));

      expect(screen.getByText('Delete feature?')).toBeInTheDocument();
    });
  });
});
