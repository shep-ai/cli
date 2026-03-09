import type { Meta, StoryObj } from '@storybook/react';
import { ActivityTab } from './activity-tab';
import type { PhaseTimingData } from '@/app/actions/get-feature-phase-timings';

const meta: Meta<typeof ActivityTab> = {
  title: 'Drawers/Feature/Tabs/ActivityTab',
  component: ActivityTab,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
  },
  decorators: [
    (Story) => (
      <div style={{ height: '600px', width: '400px', border: '1px solid var(--color-border)' }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof ActivityTab>;

/* ---------------------------------------------------------------------------
 * Data fixtures
 * ------------------------------------------------------------------------- */

const singleRunTimings: PhaseTimingData[] = [
  {
    agentRunId: 'run-1',
    phase: 'run:started',
    startedAt: '2025-01-15T10:00:00Z',
    completedAt: '2025-01-15T10:00:00Z',
    durationMs: 0,
  },
  {
    agentRunId: 'run-1',
    phase: 'analyze',
    startedAt: '2025-01-15T10:00:01Z',
    completedAt: '2025-01-15T10:00:15Z',
    durationMs: 14000,
  },
  {
    agentRunId: 'run-1',
    phase: 'requirements',
    startedAt: '2025-01-15T10:00:15Z',
    completedAt: '2025-01-15T10:01:45Z',
    durationMs: 90000,
    waitingApprovalAt: '2025-01-15T10:01:00Z',
    approvalWaitMs: 30000,
  },
  {
    agentRunId: 'run-1',
    phase: 'research',
    startedAt: '2025-01-15T10:01:45Z',
    completedAt: '2025-01-15T10:03:30Z',
    durationMs: 105000,
  },
  {
    agentRunId: 'run-1',
    phase: 'plan',
    startedAt: '2025-01-15T10:03:30Z',
    completedAt: '2025-01-15T10:05:00Z',
    durationMs: 90000,
    waitingApprovalAt: '2025-01-15T10:04:30Z',
    approvalWaitMs: 15000,
  },
  {
    agentRunId: 'run-1',
    phase: 'implement',
    startedAt: '2025-01-15T10:05:00Z',
    completedAt: '2025-01-15T10:15:00Z',
    durationMs: 600000,
  },
  {
    agentRunId: 'run-1',
    phase: 'run:completed',
    startedAt: '2025-01-15T10:15:00Z',
    completedAt: '2025-01-15T10:15:00Z',
    durationMs: 0,
  },
];

const multiRunTimings: PhaseTimingData[] = [
  // Run 1
  {
    agentRunId: 'run-1',
    phase: 'run:started',
    startedAt: '2025-01-15T10:00:00Z',
    durationMs: 0,
  },
  {
    agentRunId: 'run-1',
    phase: 'analyze',
    startedAt: '2025-01-15T10:00:01Z',
    completedAt: '2025-01-15T10:00:20Z',
    durationMs: 19000,
  },
  {
    agentRunId: 'run-1',
    phase: 'requirements',
    startedAt: '2025-01-15T10:00:20Z',
    completedAt: '2025-01-15T10:02:00Z',
    durationMs: 100000,
    waitingApprovalAt: '2025-01-15T10:01:20Z',
    approvalWaitMs: 40000,
  },
  {
    agentRunId: 'run-1',
    phase: 'run:completed',
    startedAt: '2025-01-15T10:02:00Z',
    durationMs: 0,
  },
  // Run 2
  {
    agentRunId: 'run-2',
    phase: 'run:resumed',
    startedAt: '2025-01-15T11:00:00Z',
    durationMs: 0,
  },
  {
    agentRunId: 'run-2',
    phase: 'research',
    startedAt: '2025-01-15T11:00:01Z',
    completedAt: '2025-01-15T11:02:30Z',
    durationMs: 149000,
  },
  {
    agentRunId: 'run-2',
    phase: 'plan',
    startedAt: '2025-01-15T11:02:30Z',
    completedAt: '2025-01-15T11:04:00Z',
    durationMs: 90000,
    waitingApprovalAt: '2025-01-15T11:03:30Z',
    approvalWaitMs: 20000,
  },
  {
    agentRunId: 'run-2',
    phase: 'implement',
    startedAt: '2025-01-15T11:04:00Z',
    completedAt: '2025-01-15T11:12:00Z',
    durationMs: 480000,
  },
  {
    agentRunId: 'run-2',
    phase: 'merge',
    startedAt: '2025-01-15T11:12:00Z',
    completedAt: '2025-01-15T11:13:30Z',
    durationMs: 90000,
  },
  {
    agentRunId: 'run-2',
    phase: 'run:completed',
    startedAt: '2025-01-15T11:13:30Z',
    durationMs: 0,
  },
];

const runningTimings: PhaseTimingData[] = [
  {
    agentRunId: 'run-1',
    phase: 'run:started',
    startedAt: '2025-01-15T10:00:00Z',
    durationMs: 0,
  },
  {
    agentRunId: 'run-1',
    phase: 'analyze',
    startedAt: '2025-01-15T10:00:01Z',
    completedAt: '2025-01-15T10:00:15Z',
    durationMs: 14000,
  },
  {
    agentRunId: 'run-1',
    phase: 'implement',
    startedAt: '2025-01-15T10:00:15Z',
    durationMs: 45000,
  },
];

/* ---------------------------------------------------------------------------
 * Stories
 * ------------------------------------------------------------------------- */

/** Default — single run with complete phase timings and approval waits. */
export const Default: Story = {
  args: {
    timings: singleRunTimings,
    loading: false,
    error: null,
  },
};

/** Multiple runs with run headers showing grouping. */
export const MultipleRuns: Story = {
  args: {
    timings: multiRunTimings,
    loading: false,
    error: null,
  },
};

/** Running phase — a phase without completedAt shows blue bar. */
export const RunningPhase: Story = {
  args: {
    timings: runningTimings,
    loading: false,
    error: null,
  },
};

/** Loading state — spinner displayed while data is being fetched. */
export const Loading: Story = {
  args: {
    timings: null,
    loading: true,
    error: null,
  },
};

/** Empty state — no activity recorded yet. */
export const Empty: Story = {
  args: {
    timings: [],
    loading: false,
    error: null,
  },
};

/** Error state — inline error message. */
export const Error: Story = {
  args: {
    timings: null,
    loading: false,
    error: 'Failed to load phase timings. Please try again.',
  },
};

/** Rejection — shows rejected lifecycle event after an approval wait. */
export const WithRejection: Story = {
  args: {
    timings: [
      {
        agentRunId: 'run-1',
        phase: 'run:started',
        startedAt: '2025-01-15T10:00:00Z',
        durationMs: 0,
      },
      {
        agentRunId: 'run-1',
        phase: 'analyze',
        startedAt: '2025-01-15T10:00:01Z',
        completedAt: '2025-01-15T10:00:15Z',
        durationMs: 14000,
      },
      {
        agentRunId: 'run-1',
        phase: 'requirements',
        startedAt: '2025-01-15T10:00:15Z',
        completedAt: '2025-01-15T10:01:45Z',
        durationMs: 90000,
        waitingApprovalAt: '2025-01-15T10:01:00Z',
        approvalWaitMs: 30000,
      },
      {
        agentRunId: 'run-1',
        phase: 'run:rejected',
        startedAt: '2025-01-15T10:01:45Z',
        durationMs: 0,
      },
      {
        agentRunId: 'run-1',
        phase: 'run:resumed',
        startedAt: '2025-01-15T10:02:00Z',
        durationMs: 0,
      },
      {
        agentRunId: 'run-1',
        phase: 'requirements:2',
        startedAt: '2025-01-15T10:02:01Z',
        completedAt: '2025-01-15T10:03:30Z',
        durationMs: 89000,
        waitingApprovalAt: '2025-01-15T10:03:00Z',
        approvalWaitMs: 15000,
      },
      {
        agentRunId: 'run-1',
        phase: 'research',
        startedAt: '2025-01-15T10:03:30Z',
        completedAt: '2025-01-15T10:05:00Z',
        durationMs: 90000,
      },
      {
        agentRunId: 'run-1',
        phase: 'run:completed',
        startedAt: '2025-01-15T10:05:00Z',
        durationMs: 0,
      },
    ],
    loading: false,
    error: null,
  },
};

/** Approval wait indicators — phases with approval wait sub-rows. */
export const WithApprovalWaits: Story = {
  args: {
    timings: [
      {
        agentRunId: 'run-1',
        phase: 'requirements',
        startedAt: '2025-01-15T10:00:00Z',
        completedAt: '2025-01-15T10:03:00Z',
        durationMs: 180000,
        waitingApprovalAt: '2025-01-15T10:01:00Z',
        approvalWaitMs: 120000,
      },
      {
        agentRunId: 'run-1',
        phase: 'plan',
        startedAt: '2025-01-15T10:03:00Z',
        completedAt: '2025-01-15T10:06:00Z',
        durationMs: 180000,
        waitingApprovalAt: '2025-01-15T10:04:00Z',
        approvalWaitMs: 90000,
      },
      {
        agentRunId: 'run-1',
        phase: 'implement',
        startedAt: '2025-01-15T10:06:00Z',
        completedAt: '2025-01-15T10:16:00Z',
        durationMs: 600000,
      },
    ],
    loading: false,
    error: null,
  },
};
