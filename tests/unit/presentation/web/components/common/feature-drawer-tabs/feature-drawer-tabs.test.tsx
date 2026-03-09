import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FeatureDrawerTabs } from '@/components/common/feature-drawer-tabs/feature-drawer-tabs';
import type { FeatureNodeData } from '@/components/common/feature-node';
import type { PhaseTimingData } from '@/app/actions/get-feature-phase-timings';
import type { PlanData } from '@/app/actions/get-feature-plan';

// Mock server actions
const mockGetPhaseTimings = vi.fn();
const mockGetPlan = vi.fn();

vi.mock('@/app/actions/get-feature-phase-timings', () => ({
  getFeaturePhaseTimings: (...args: unknown[]) => mockGetPhaseTimings(...args),
}));

vi.mock('@/app/actions/get-feature-plan', () => ({
  getFeaturePlan: (...args: unknown[]) => mockGetPlan(...args),
}));

vi.mock('@/hooks/use-feature-logs', () => ({
  useFeatureLogs: () => ({ content: '', isConnected: false, error: null }),
}));

vi.mock('@/hooks/use-sound-action', () => ({
  useSoundAction: vi.fn(() => ({ play: vi.fn(), stop: vi.fn(), isPlaying: false })),
}));

vi.mock('@/hooks/use-deploy-action', () => ({
  useDeployAction: () => ({
    deploy: vi.fn(),
    stop: vi.fn(),
    deployLoading: false,
    stopLoading: false,
    deployError: null,
    status: null,
    url: null,
  }),
}));

vi.mock('@/components/common/deployment-status-badge', () => ({
  DeploymentStatusBadge: ({ status }: { status: string | null }) =>
    status ? <div data-testid="deployment-status-badge" data-status={status} /> : null,
}));

const defaultFeatureNode: FeatureNodeData = {
  name: 'Test Feature',
  description: 'A test feature',
  featureId: '#f1',
  lifecycle: 'implementation',
  state: 'running',
  progress: 50,
  repositoryPath: '/home/user/repo',
  branch: 'feat/test',
};

const sampleTimings: PhaseTimingData[] = [
  {
    agentRunId: 'run-001',
    phase: 'analyze',
    startedAt: '2024-01-01T00:00:00.000Z',
    completedAt: '2024-01-01T00:00:05.000Z',
    durationMs: 5000,
  },
];

const samplePlan: PlanData = {
  state: 'Ready',
  overview: 'Implementation plan',
  tasks: [{ title: 'Task 1', description: 'Do something', state: 'Todo', actionItems: [] }],
};

function renderTabs(props: Partial<{ featureNode: FeatureNodeData; featureId: string }> = {}) {
  const defaultProps = {
    featureNode: defaultFeatureNode,
    featureId: '#f1',
    ...props,
  };
  return render(<FeatureDrawerTabs {...defaultProps} />);
}

beforeEach(() => {
  vi.clearAllMocks();

  mockGetPhaseTimings.mockResolvedValue({ timings: sampleTimings });
  mockGetPlan.mockResolvedValue({ plan: samplePlan });
});

describe('FeatureDrawerTabs', () => {
  describe('tab triggers', () => {
    it('renders four tab triggers', () => {
      renderTabs();
      expect(screen.getByRole('tab', { name: 'Overview' })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: 'Activity' })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: 'Log' })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: 'Plan' })).toBeInTheDocument();
    });
  });

  describe('default tab', () => {
    it('overview tab is active by default', () => {
      renderTabs();
      const overviewTab = screen.getByRole('tab', { name: 'Overview' });
      expect(overviewTab).toHaveAttribute('data-state', 'active');
    });

    it('renders overview content by default', () => {
      renderTabs();
      // OverviewTab renders the status test id
      expect(screen.getByTestId('feature-drawer-status')).toBeInTheDocument();
    });
  });

  describe('lazy data fetching', () => {
    it('does not fetch any data on initial render', () => {
      renderTabs();
      expect(mockGetPhaseTimings).not.toHaveBeenCalled();
      expect(mockGetPlan).not.toHaveBeenCalled();
    });

    it('clicking Activity tab triggers phase timings fetch', async () => {
      const user = userEvent.setup();
      renderTabs();

      await user.click(screen.getByRole('tab', { name: 'Activity' }));

      expect(mockGetPhaseTimings).toHaveBeenCalledWith('#f1');
    });

    it('clicking Plan tab triggers plan fetch', async () => {
      const user = userEvent.setup();
      renderTabs();

      await user.click(screen.getByRole('tab', { name: 'Plan' }));

      expect(mockGetPlan).toHaveBeenCalledWith('#f1');
    });

    it('clicking Activity tab again does not trigger another fetch (cache hit)', async () => {
      const user = userEvent.setup();
      renderTabs();

      await user.click(screen.getByRole('tab', { name: 'Activity' }));
      expect(mockGetPhaseTimings).toHaveBeenCalledTimes(1);

      // Switch away then back
      await user.click(screen.getByRole('tab', { name: 'Overview' }));
      await user.click(screen.getByRole('tab', { name: 'Activity' }));
      expect(mockGetPhaseTimings).toHaveBeenCalledTimes(1);
    });
  });

  describe('feature id change', () => {
    it('resets to Overview tab when featureId changes', async () => {
      const user = userEvent.setup();
      const { rerender } = renderTabs();

      // Switch to Activity tab
      await user.click(screen.getByRole('tab', { name: 'Activity' }));
      expect(screen.getByRole('tab', { name: 'Activity' })).toHaveAttribute('data-state', 'active');

      // Change featureId
      rerender(
        <FeatureDrawerTabs
          featureNode={{ ...defaultFeatureNode, featureId: '#f2' }}
          featureId="#f2"
        />
      );

      // Should reset to Overview
      expect(screen.getByRole('tab', { name: 'Overview' })).toHaveAttribute('data-state', 'active');
    });
  });

  describe('SSE refresh', () => {
    it('re-fetches active tab data when featureNode prop changes', async () => {
      const user = userEvent.setup();
      const { rerender } = renderTabs();

      // Switch to Activity tab and wait for initial fetch
      await user.click(screen.getByRole('tab', { name: 'Activity' }));
      expect(mockGetPhaseTimings).toHaveBeenCalledTimes(1);

      // Simulate SSE refresh by changing featureNode reference
      rerender(<FeatureDrawerTabs featureNode={{ ...defaultFeatureNode }} featureId="#f1" />);

      // Should refresh the active tab
      expect(mockGetPhaseTimings).toHaveBeenCalledTimes(2);
    });

    it('does not re-fetch when overview tab is active and featureNode changes', () => {
      const { rerender } = renderTabs();

      // Simulate SSE refresh while on Overview
      rerender(<FeatureDrawerTabs featureNode={{ ...defaultFeatureNode }} featureId="#f1" />);

      // No fetches should happen — Overview uses prop data directly
      expect(mockGetPhaseTimings).not.toHaveBeenCalled();
      expect(mockGetPlan).not.toHaveBeenCalled();
    });
  });
});
