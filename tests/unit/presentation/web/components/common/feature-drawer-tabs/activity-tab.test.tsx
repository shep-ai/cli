import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { ActivityTab } from '@/components/common/feature-drawer-tabs/activity-tab';
import type { PhaseTimingData } from '@/app/actions/get-feature-phase-timings';

const run1Id = 'run-001';
const run2Id = 'run-002';

const singleRunTimings: PhaseTimingData[] = [
  {
    agentRunId: run1Id,
    phase: 'run:started',
    startedAt: '2024-01-01T00:00:00.000Z',
  },
  {
    agentRunId: run1Id,
    phase: 'analyze',
    startedAt: '2024-01-01T00:00:00.000Z',
    completedAt: '2024-01-01T00:00:05.000Z',
    durationMs: 5000,
  },
  {
    agentRunId: run1Id,
    phase: 'requirements',
    startedAt: '2024-01-01T00:00:05.000Z',
    completedAt: '2024-01-01T00:00:15.000Z',
    durationMs: 10000,
    waitingApprovalAt: '2024-01-01T00:00:12.000Z',
    approvalWaitMs: 3000,
  },
  {
    agentRunId: run1Id,
    phase: 'run:completed',
    startedAt: '2024-01-01T00:00:15.000Z',
  },
];

const multiRunTimings: PhaseTimingData[] = [
  {
    agentRunId: run1Id,
    phase: 'run:started',
    startedAt: '2024-01-01T00:00:00.000Z',
  },
  {
    agentRunId: run1Id,
    phase: 'analyze',
    startedAt: '2024-01-01T00:00:00.000Z',
    completedAt: '2024-01-01T00:00:05.000Z',
    durationMs: 5000,
  },
  {
    agentRunId: run1Id,
    phase: 'run:completed',
    startedAt: '2024-01-01T00:00:05.000Z',
  },
  {
    agentRunId: run2Id,
    phase: 'run:started',
    startedAt: '2024-01-01T00:01:00.000Z',
  },
  {
    agentRunId: run2Id,
    phase: 'implement',
    startedAt: '2024-01-01T00:01:00.000Z',
    completedAt: '2024-01-01T00:01:20.000Z',
    durationMs: 20000,
  },
  {
    agentRunId: run2Id,
    phase: 'run:completed',
    startedAt: '2024-01-01T00:01:20.000Z',
  },
];

function renderActivityTab(
  props: Partial<{
    timings: PhaseTimingData[] | null;
    loading: boolean;
    error: string | null;
  }> = {}
) {
  const defaultProps = {
    timings: null as PhaseTimingData[] | null,
    loading: false,
    error: null as string | null,
    ...props,
  };
  return render(<ActivityTab {...defaultProps} />);
}

describe('ActivityTab', () => {
  describe('loading state', () => {
    it('renders loading spinner when loading=true', () => {
      renderActivityTab({ loading: true });
      expect(screen.getByTestId('activity-tab-loading')).toBeInTheDocument();
    });

    it('does not render timings when loading', () => {
      renderActivityTab({ loading: true, timings: singleRunTimings });
      expect(screen.queryByTestId('activity-timings')).not.toBeInTheDocument();
    });
  });

  describe('empty state', () => {
    it('renders empty state when timings array is empty', () => {
      renderActivityTab({ timings: [] });
      expect(screen.getByText('No activity recorded yet')).toBeInTheDocument();
    });

    it('renders empty state when timings is null and not loading', () => {
      renderActivityTab({ timings: null });
      expect(screen.getByText('No activity recorded yet')).toBeInTheDocument();
    });
  });

  describe('error state', () => {
    it('renders error message when error is provided', () => {
      renderActivityTab({ error: 'Failed to load phase timings' });
      expect(screen.getByText('Failed to load phase timings')).toBeInTheDocument();
    });

    it('does not render timings when error is present', () => {
      renderActivityTab({ error: 'Some error', timings: singleRunTimings });
      expect(screen.queryByTestId('activity-timings')).not.toBeInTheDocument();
    });
  });

  describe('phase timing rendering', () => {
    it('renders phase name and duration for each node timing', () => {
      renderActivityTab({ timings: singleRunTimings });
      expect(screen.getByText('Analyzing')).toBeInTheDocument();
      expect(screen.getByText('Requirements')).toBeInTheDocument();
    });

    it('renders duration text next to each completed timing', () => {
      renderActivityTab({ timings: singleRunTimings });
      expect(screen.getByText('5.0s')).toBeInTheDocument();
      expect(screen.getByText('10.0s')).toBeInTheDocument();
    });

    it('renders a duration bar for each node timing', () => {
      renderActivityTab({ timings: singleRunTimings });
      const timingsContainer = screen.getByTestId('activity-timings');
      const bars = within(timingsContainer).getAllByTestId(/^timing-bar-/);
      // 2 node timings (analyze, requirements) — lifecycle events are not bars
      expect(bars.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('multi-run grouping', () => {
    it('groups timings by agentRunId with run headers', () => {
      renderActivityTab({ timings: multiRunTimings });
      expect(screen.getByText('Run #1')).toBeInTheDocument();
      expect(screen.getByText('Run #2')).toBeInTheDocument();
    });

    it('does not show run headers for single-run timings', () => {
      renderActivityTab({ timings: singleRunTimings });
      expect(screen.queryByText('Run #1')).not.toBeInTheDocument();
    });
  });

  describe('approval wait sub-row', () => {
    it('renders approval wait sub-row when approvalWaitMs > 0', () => {
      renderActivityTab({ timings: singleRunTimings });
      // Requirements has approvalWaitMs: 3000
      const waitRow = screen.getByTestId('approval-wait-requirements');
      expect(waitRow).toBeInTheDocument();
      expect(within(waitRow).getByText('3.0s')).toBeInTheDocument();
    });

    it('does not render approval wait for phases without approvalWaitMs', () => {
      renderActivityTab({ timings: singleRunTimings });
      // Analyze has no approvalWaitMs
      expect(screen.queryByTestId('approval-wait-analyze')).not.toBeInTheDocument();
    });
  });

  describe('summary totals', () => {
    it('renders total execution time', () => {
      renderActivityTab({ timings: singleRunTimings });
      const summary = screen.getByTestId('activity-summary');
      expect(within(summary).getByText('Total execution')).toBeInTheDocument();
      // 5000 + 10000 = 15000ms = 15.0s
      expect(within(summary).getByText('15.0s')).toBeInTheDocument();
    });

    it('renders total wait time when approval waits exist', () => {
      renderActivityTab({ timings: singleRunTimings });
      const summary = screen.getByTestId('activity-summary');
      expect(within(summary).getByText('Total wait')).toBeInTheDocument();
    });

    it('renders total wall-clock time when waits exist', () => {
      renderActivityTab({ timings: singleRunTimings });
      const summary = screen.getByTestId('activity-summary');
      expect(within(summary).getByText('Total wall-clock')).toBeInTheDocument();
      // 15000 + 3000 = 18000ms = 18.0s
      expect(within(summary).getByText('18.0s')).toBeInTheDocument();
    });

    it('does not render summary when there are no node timings', () => {
      const lifecycleOnly: PhaseTimingData[] = [
        { agentRunId: run1Id, phase: 'run:started', startedAt: '2024-01-01T00:00:00.000Z' },
      ];
      renderActivityTab({ timings: lifecycleOnly });
      expect(screen.queryByTestId('activity-summary')).not.toBeInTheDocument();
    });
  });

  describe('lifecycle events', () => {
    it('renders lifecycle event markers', () => {
      renderActivityTab({ timings: singleRunTimings });
      // run:started and run:completed lifecycle events
      expect(screen.getByText('started')).toBeInTheDocument();
      expect(screen.getByText('completed')).toBeInTheDocument();
    });
  });

  describe('color coding', () => {
    it('applies emerald color for completed phase bars', () => {
      renderActivityTab({ timings: singleRunTimings });
      const bar = screen.getByTestId('timing-bar-analyze');
      expect(bar.querySelector('.bg-emerald-500')).toBeInTheDocument();
    });

    it('applies amber color for approval wait bars', () => {
      renderActivityTab({ timings: singleRunTimings });
      const waitBar = screen.getByTestId('approval-wait-requirements');
      expect(waitBar.querySelector('.bg-amber-500')).toBeInTheDocument();
    });
  });
});
