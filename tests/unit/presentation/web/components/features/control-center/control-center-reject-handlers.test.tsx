import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act, fireEvent, waitFor, cleanup } from '@testing-library/react';

// ── Server action mocks ──────────────────────────────────────────────
const mockApproveFeature = vi.fn();
const mockRejectFeature = vi.fn();
const mockGetFeatureArtifact = vi.fn();
const mockGetResearchArtifact = vi.fn();

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

vi.mock('@/app/actions/approve-feature', () => ({
  approveFeature: (...args: unknown[]) => mockApproveFeature(...args),
}));

vi.mock('@/app/actions/reject-feature', () => ({
  rejectFeature: (...args: unknown[]) => mockRejectFeature(...args),
}));

vi.mock('@/app/actions/get-feature-artifact', () => ({
  getFeatureArtifact: (...args: unknown[]) => mockGetFeatureArtifact(...args),
}));

vi.mock('@/app/actions/get-research-artifact', () => ({
  getResearchArtifact: (...args: unknown[]) => mockGetResearchArtifact(...args),
}));

vi.mock('@/app/actions/get-workflow-defaults', () => ({
  getWorkflowDefaults: vi.fn().mockResolvedValue({}),
}));

vi.mock('@/app/actions/get-merge-review-data', () => ({
  getMergeReviewData: vi.fn().mockResolvedValue({}),
}));

vi.mock('@/components/common/notification-permission-banner', () => ({
  NotificationPermissionBanner: () => null,
}));

// ── Toast mock ────────────────────────────────────────────────────────
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
  },
}));

import { toast as mockToast } from 'sonner';

// ── Component imports (after mocks) ──────────────────────────────────
import { ControlCenterInner } from '@/components/features/control-center/control-center-inner';
import type { FeaturesCanvasProps } from '@/components/features/features-canvas';
import type { CanvasNodeType } from '@/components/features/features-canvas';
import type { FeatureNodeData } from '@/components/common/feature-node';

// ── Canvas + empty state mock ─────────────────────────────────────────
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

// ── Test data ─────────────────────────────────────────────────────────
const questionnaireData = {
  question: 'Review Requirements',
  context: 'Please review',
  questions: [
    {
      id: 'q-1',
      question: 'What problem does this solve?',
      type: 'select' as const,
      options: [
        { id: 'opt-a', label: 'Pain Point', rationale: 'Addresses pain', recommended: true },
        { id: 'opt-b', label: 'Feature Gap', rationale: 'Fills a gap' },
      ],
    },
    {
      id: 'q-2',
      question: 'What is the priority?',
      type: 'select' as const,
      options: [
        { id: 'opt-high', label: 'High', rationale: 'Urgent', recommended: true },
        { id: 'opt-low', label: 'Low', rationale: 'Not urgent' },
      ],
    },
  ],
  finalAction: { id: 'approve', label: 'Approve Requirements', description: 'Finalize' },
};

const techDecisionsData = {
  name: 'Test Research',
  summary: 'Test summary',
  decisions: [
    {
      title: 'Database Choice',
      chosen: 'PostgreSQL',
      rationale: 'Best fit',
      rejected: ['MySQL'],
    },
  ],
  technologies: ['TypeScript'],
};

const repoNode: CanvasNodeType = {
  id: 'repo-1',
  type: 'repositoryNode',
  position: { x: 50, y: 50 },
  data: { name: 'my-repo', repositoryPath: '/tmp/repo', id: 'repo-1' },
} as CanvasNodeType;

const prdNode: CanvasNodeType = {
  id: 'feat-prd',
  type: 'featureNode',
  position: { x: 100, y: 100 },
  data: {
    name: 'Auth Module',
    featureId: '#feat-1',
    lifecycle: 'requirements',
    state: 'action-required',
    progress: 50,
    repositoryPath: '/tmp/repo',
    branch: 'feat/auth',
  } as FeatureNodeData,
};

const techNode: CanvasNodeType = {
  id: 'feat-tech',
  type: 'featureNode',
  position: { x: 100, y: 300 },
  data: {
    name: 'Payment Module',
    featureId: '#feat-2',
    lifecycle: 'implementation',
    state: 'action-required',
    progress: 30,
    repositoryPath: '/tmp/repo',
    branch: 'feat/payment',
  } as FeatureNodeData,
};

function renderControlCenter(nodes: CanvasNodeType[] = [repoNode, prdNode, techNode]) {
  return render(<ControlCenterInner initialNodes={nodes} initialEdges={[]} />);
}

/**
 * Selects the PRD node, waits for questionnaire to load, and navigates to last step.
 * Returns when the "Approve Requirements" button is visible.
 */
async function openPrdDrawerOnLastStep() {
  mockGetFeatureArtifact.mockResolvedValue({ questionnaire: questionnaireData });

  renderControlCenter();

  await act(async () => {
    capturedCanvasProps.onNodeClick?.({} as React.MouseEvent, prdNode);
  });

  // Wait for questionnaire to load
  await waitFor(() => {
    expect(screen.getByText('What problem does this solve?')).toBeInTheDocument();
  });

  // Select answer on first step — component auto-advances after 250ms
  const optionA = screen.getAllByRole('button').find((b) => b.textContent?.includes('Pain Point'));
  await act(async () => {
    fireEvent.click(optionA!);
  });

  // Wait for auto-advance to last step
  await waitFor(() => {
    expect(screen.getByText('What is the priority?')).toBeInTheDocument();
  });

  const highOpt = screen.getAllByRole('button').find((b) => b.textContent?.includes('High'));
  await act(async () => {
    fireEvent.click(highOpt!);
  });
}

/**
 * Selects the tech node and waits for tech decisions to load.
 */
async function openTechDecisionsDrawer() {
  mockGetResearchArtifact.mockResolvedValue({ techDecisions: techDecisionsData });

  renderControlCenter();

  await act(async () => {
    capturedCanvasProps.onNodeClick?.({} as React.MouseEvent, techNode);
  });

  await waitFor(() => {
    expect(screen.getByText('Database Choice')).toBeInTheDocument();
  });
}

describe('ControlCenterInner reject handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  describe('handlePrdReject', () => {
    it('calls rejectFeature and shows success toast on successful rejection', async () => {
      mockRejectFeature.mockResolvedValue({
        rejected: true,
        iteration: 2,
        iterationWarning: false,
      });
      await openPrdDrawerOnLastStep();

      // Click reject button
      const rejectBtn = screen.getByRole('button', { name: /reject/i });
      await act(async () => {
        fireEvent.click(rejectBtn);
      });

      // Fill in feedback in the dialog
      const textarea = screen.getByLabelText('Rejection feedback');
      await act(async () => {
        fireEvent.change(textarea, { target: { value: 'Needs more detail' } });
      });

      // Click confirm
      const confirmBtn = screen.getByRole('button', { name: /confirm reject/i });
      await act(async () => {
        fireEvent.click(confirmBtn);
      });

      await waitFor(() => {
        expect(mockRejectFeature).toHaveBeenCalledWith('#feat-1', 'Needs more detail');
      });

      expect(mockToast.success).toHaveBeenCalledWith(
        'Requirements rejected — agent re-iterating (iteration 2)'
      );
    });

    it('shows warning toast when iterationWarning is true', async () => {
      mockRejectFeature.mockResolvedValue({ rejected: true, iteration: 5, iterationWarning: true });
      await openPrdDrawerOnLastStep();

      const rejectBtn = screen.getByRole('button', { name: /reject/i });
      await act(async () => {
        fireEvent.click(rejectBtn);
      });

      const textarea = screen.getByLabelText('Rejection feedback');
      await act(async () => {
        fireEvent.change(textarea, { target: { value: 'Still wrong' } });
      });

      const confirmBtn = screen.getByRole('button', { name: /confirm reject/i });
      await act(async () => {
        fireEvent.click(confirmBtn);
      });

      await waitFor(() => {
        expect(mockToast.success).toHaveBeenCalledWith(
          'Requirements rejected — agent re-iterating (iteration 5)'
        );
      });

      expect(mockToast.warning).toHaveBeenCalledWith(
        'Iteration 5 — consider approving or adjusting feedback to avoid excessive iterations'
      );
    });

    it('shows error toast on failure and does not clear selection', async () => {
      mockRejectFeature.mockResolvedValue({ rejected: false, error: 'Not waiting for approval' });
      await openPrdDrawerOnLastStep();

      const rejectBtn = screen.getByRole('button', { name: /reject/i });
      await act(async () => {
        fireEvent.click(rejectBtn);
      });

      const textarea = screen.getByLabelText('Rejection feedback');
      await act(async () => {
        fireEvent.change(textarea, { target: { value: 'Bad requirements' } });
      });

      const confirmBtn = screen.getByRole('button', { name: /confirm reject/i });
      await act(async () => {
        fireEvent.click(confirmBtn);
      });

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith('Not waiting for approval');
      });

      // Drawer should still be showing (selection not cleared)
      expect(mockToast.success).not.toHaveBeenCalled();
    });
  });

  describe('handleTechDecisionsReject', () => {
    it('calls rejectFeature and shows success toast with plan message', async () => {
      mockRejectFeature.mockResolvedValue({
        rejected: true,
        iteration: 3,
        iterationWarning: false,
      });
      await openTechDecisionsDrawer();

      const rejectBtn = screen.getByRole('button', { name: /reject/i });
      await act(async () => {
        fireEvent.click(rejectBtn);
      });

      const textarea = screen.getByLabelText('Rejection feedback');
      await act(async () => {
        fireEvent.change(textarea, { target: { value: 'Wrong tech choices' } });
      });

      const confirmBtn = screen.getByRole('button', { name: /confirm reject/i });
      await act(async () => {
        fireEvent.click(confirmBtn);
      });

      await waitFor(() => {
        expect(mockRejectFeature).toHaveBeenCalledWith('#feat-2', 'Wrong tech choices');
      });

      expect(mockToast.success).toHaveBeenCalledWith(
        'Plan rejected — agent re-iterating (iteration 3)'
      );
    });

    it('shows warning toast on tech decisions reject when iterationWarning is true', async () => {
      mockRejectFeature.mockResolvedValue({ rejected: true, iteration: 6, iterationWarning: true });
      await openTechDecisionsDrawer();

      const rejectBtn = screen.getByRole('button', { name: /reject/i });
      await act(async () => {
        fireEvent.click(rejectBtn);
      });

      const textarea = screen.getByLabelText('Rejection feedback');
      await act(async () => {
        fireEvent.change(textarea, { target: { value: 'Reconsider approach' } });
      });

      const confirmBtn = screen.getByRole('button', { name: /confirm reject/i });
      await act(async () => {
        fireEvent.click(confirmBtn);
      });

      await waitFor(() => {
        expect(mockToast.warning).toHaveBeenCalledWith(
          'Iteration 6 — consider approving or adjusting feedback to avoid excessive iterations'
        );
      });
    });

    it('shows error toast on tech decisions reject failure', async () => {
      mockRejectFeature.mockResolvedValue({ rejected: false, error: 'Server error' });
      await openTechDecisionsDrawer();

      const rejectBtn = screen.getByRole('button', { name: /reject/i });
      await act(async () => {
        fireEvent.click(rejectBtn);
      });

      const textarea = screen.getByLabelText('Rejection feedback');
      await act(async () => {
        fireEvent.change(textarea, { target: { value: 'Feedback' } });
      });

      const confirmBtn = screen.getByRole('button', { name: /confirm reject/i });
      await act(async () => {
        fireEvent.click(confirmBtn);
      });

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith('Server error');
      });

      expect(mockToast.success).not.toHaveBeenCalled();
    });
  });

  describe('handlePrdApprove with payload forwarding', () => {
    it('forwards prdSelections as PrdApprovalPayload with question and option text', async () => {
      mockApproveFeature.mockResolvedValue({ approved: true });
      await openPrdDrawerOnLastStep();

      // Click approve (multiple buttons share the label; pick the first)
      const approveBtns = screen.getAllByRole('button', { name: /approve requirements/i });
      await act(async () => {
        fireEvent.click(approveBtns[0]);
      });

      await waitFor(() => {
        expect(mockApproveFeature).toHaveBeenCalledWith('#feat-1', {
          approved: true,
          changedSelections: expect.arrayContaining([
            { questionId: 'What problem does this solve?', selectedOption: 'Pain Point' },
            { questionId: 'What is the priority?', selectedOption: 'High' },
          ]),
        });
      });

      expect(mockToast.success).toHaveBeenCalledWith('Requirements approved — agent resuming');
    });

    it('shows error toast when approve fails', async () => {
      mockApproveFeature.mockResolvedValue({ approved: false, error: 'Approval failed' });
      await openPrdDrawerOnLastStep();

      const approveBtns = screen.getAllByRole('button', { name: /approve requirements/i });
      await act(async () => {
        fireEvent.click(approveBtns[0]);
      });

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith('Approval failed');
      });

      expect(mockToast.success).not.toHaveBeenCalled();
    });
  });
});
