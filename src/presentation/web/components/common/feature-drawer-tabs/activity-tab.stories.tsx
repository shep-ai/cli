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
    inputTokens: 28500,
    outputTokens: 3200,
    cacheCreationInputTokens: 22000,
    cacheReadInputTokens: 0,
    costUsd: 0.1245,
    numTurns: 2,
    durationApiMs: 8400,
  },
  {
    agentRunId: 'run-1',
    phase: 'requirements',
    startedAt: '2025-01-15T10:00:15Z',
    completedAt: '2025-01-15T10:01:45Z',
    durationMs: 90000,
    waitingApprovalAt: '2025-01-15T10:01:00Z',
    approvalWaitMs: 30000,
    inputTokens: 45200,
    outputTokens: 8100,
    cacheCreationInputTokens: 12000,
    cacheReadInputTokens: 22000,
    costUsd: 0.2831,
    numTurns: 5,
    durationApiMs: 42000,
  },
  {
    agentRunId: 'run-1',
    phase: 'research',
    startedAt: '2025-01-15T10:01:45Z',
    completedAt: '2025-01-15T10:03:30Z',
    durationMs: 105000,
    inputTokens: 92400,
    outputTokens: 15600,
    cacheCreationInputTokens: 8000,
    cacheReadInputTokens: 34000,
    costUsd: 0.5127,
    numTurns: 8,
    durationApiMs: 78000,
  },
  {
    agentRunId: 'run-1',
    phase: 'plan',
    startedAt: '2025-01-15T10:03:30Z',
    completedAt: '2025-01-15T10:05:00Z',
    durationMs: 90000,
    waitingApprovalAt: '2025-01-15T10:04:30Z',
    approvalWaitMs: 15000,
    inputTokens: 68300,
    outputTokens: 12400,
    cacheCreationInputTokens: 5000,
    cacheReadInputTokens: 34000,
    costUsd: 0.3892,
    numTurns: 6,
    durationApiMs: 55000,
  },
  {
    agentRunId: 'run-1',
    phase: 'implement',
    startedAt: '2025-01-15T10:05:00Z',
    completedAt: '2025-01-15T10:15:00Z',
    durationMs: 600000,
    inputTokens: 485000,
    outputTokens: 128000,
    cacheCreationInputTokens: 45000,
    cacheReadInputTokens: 34000,
    costUsd: 3.2451,
    numTurns: 42,
    durationApiMs: 385000,
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

/** Rejection — shows rejected lifecycle event with user feedback text. */
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
    rejectionFeedback: [
      {
        iteration: 1,
        message: 'The requirements are missing error handling for edge cases',
        phase: 'requirements',
      },
    ],
    loading: false,
    error: null,
  },
};

/**
 * Multiple rejection/resume cycles — realistic lifecycle showing:
 * Iteration 1: work → rejected("rebase on main")
 * Iteration 2: resumed → work → rejected("rebase on main")
 * Iteration 3: rejected("add support for evidence agent...") — synthetic
 * Iteration 4: rejected("screenshots broken...") — synthetic
 */
export const MultipleRejections: Story = {
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
        phase: 'plan',
        startedAt: '2025-01-15T10:00:01Z',
        completedAt: '2025-01-15T10:05:00Z',
        durationMs: 300000,
      },
      {
        agentRunId: 'run-1',
        phase: 'run:rejected',
        startedAt: '2025-01-15T10:05:00Z',
        durationMs: 0,
      },
      {
        agentRunId: 'run-1',
        phase: 'run:resumed',
        startedAt: '2025-01-15T10:10:00Z',
        durationMs: 0,
      },
      {
        agentRunId: 'run-1',
        phase: 'merge',
        startedAt: '2025-01-15T10:10:01Z',
        completedAt: '2025-01-15T10:15:00Z',
        durationMs: 299000,
      },
      {
        agentRunId: 'run-1',
        phase: 'run:rejected',
        startedAt: '2025-01-15T10:15:00Z',
        durationMs: 0,
      },
    ],
    rejectionFeedback: [
      {
        iteration: 1,
        message: 'rebase on main',
        phase: 'plan',
        timestamp: '2025-01-15T10:05:00Z',
      },
      {
        iteration: 2,
        message: 'rebase on main',
        phase: 'merge',
        timestamp: '2025-01-15T10:15:00Z',
      },
      {
        iteration: 3,
        message: 'add support for evidence agent into fast mode as well',
        phase: 'merge',
        timestamp: '2025-01-15T10:20:00Z',
      },
      {
        iteration: 4,
        message:
          "I've test and created a feature but the screenshots seems to be broken https://github.com/shep-ai/cli/pull/258 fix",
        phase: 'merge',
        timestamp: '2025-01-15T10:25:00Z',
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

/**
 * Full lifecycle — realistic multi-iteration rejection/resume cycle.
 * Shows the full pattern: start → work → rejected → resumed → work → rejected → resumed → completed
 */
export const FullLifecycle: Story = {
  args: {
    timings: [
      // Iteration 1
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
        completedAt: '2025-01-15T10:02:00Z',
        durationMs: 105000,
        waitingApprovalAt: '2025-01-15T10:01:30Z',
        approvalWaitMs: 20000,
      },
      {
        agentRunId: 'run-1',
        phase: 'plan',
        startedAt: '2025-01-15T10:02:00Z',
        completedAt: '2025-01-15T10:04:00Z',
        durationMs: 120000,
      },
      {
        agentRunId: 'run-1',
        phase: 'implement',
        startedAt: '2025-01-15T10:04:00Z',
        completedAt: '2025-01-15T10:14:00Z',
        durationMs: 600000,
      },
      {
        agentRunId: 'run-1',
        phase: 'merge',
        startedAt: '2025-01-15T10:14:00Z',
        completedAt: '2025-01-15T10:15:00Z',
        durationMs: 60000,
        waitingApprovalAt: '2025-01-15T10:14:30Z',
        approvalWaitMs: 25000,
      },
      {
        agentRunId: 'run-1',
        phase: 'run:rejected',
        startedAt: '2025-01-15T10:15:00Z',
        durationMs: 0,
      },
      // Iteration 2
      {
        agentRunId: 'run-1',
        phase: 'run:resumed',
        startedAt: '2025-01-15T10:20:00Z',
        durationMs: 0,
      },
      {
        agentRunId: 'run-1',
        phase: 'implement',
        startedAt: '2025-01-15T10:20:01Z',
        completedAt: '2025-01-15T10:28:00Z',
        durationMs: 479000,
      },
      {
        agentRunId: 'run-1',
        phase: 'merge',
        startedAt: '2025-01-15T10:28:00Z',
        completedAt: '2025-01-15T10:29:00Z',
        durationMs: 60000,
        waitingApprovalAt: '2025-01-15T10:28:30Z',
        approvalWaitMs: 20000,
      },
      {
        agentRunId: 'run-1',
        phase: 'run:rejected',
        startedAt: '2025-01-15T10:29:00Z',
        durationMs: 0,
      },
      // Iteration 3
      {
        agentRunId: 'run-1',
        phase: 'run:resumed',
        startedAt: '2025-01-15T10:35:00Z',
        durationMs: 0,
      },
      {
        agentRunId: 'run-1',
        phase: 'implement',
        startedAt: '2025-01-15T10:35:01Z',
        completedAt: '2025-01-15T10:40:00Z',
        durationMs: 299000,
      },
      {
        agentRunId: 'run-1',
        phase: 'merge',
        startedAt: '2025-01-15T10:40:00Z',
        completedAt: '2025-01-15T10:41:00Z',
        durationMs: 60000,
      },
      {
        agentRunId: 'run-1',
        phase: 'run:completed',
        startedAt: '2025-01-15T10:41:00Z',
        durationMs: 0,
      },
    ],
    rejectionFeedback: [
      {
        iteration: 1,
        message: 'The PR has merge conflicts — rebase on main first',
        phase: 'merge',
        timestamp: '2025-01-15T10:15:00Z',
      },
      {
        iteration: 2,
        message: 'Tests are failing in the CI pipeline — fix the snapshot tests',
        phase: 'merge',
        timestamp: '2025-01-15T10:29:00Z',
      },
    ],
    loading: false,
    error: null,
  },
};

/**
 * Waiting for approval (live) — simulates the case where the agent has completed
 * a phase and is currently waiting for user approval. The "awaiting" sub-row shows
 * a pulsing amber indicator with a live-ticking timer.
 *
 * This covers the bug where the second merge iteration (after rejection + fixes)
 * did not show any approval wait indicator.
 */
export const WaitingForApproval: Story = {
  args: {
    timings: [
      {
        agentRunId: 'run-1',
        phase: 'run:started',
        startedAt: new Date(Date.now() - 120000).toISOString(),
        durationMs: 0,
      },
      {
        agentRunId: 'run-1',
        phase: 'analyze',
        startedAt: new Date(Date.now() - 119000).toISOString(),
        completedAt: new Date(Date.now() - 105000).toISOString(),
        durationMs: 14000,
      },
      {
        agentRunId: 'run-1',
        phase: 'implement',
        startedAt: new Date(Date.now() - 105000).toISOString(),
        completedAt: new Date(Date.now() - 60000).toISOString(),
        durationMs: 45000,
      },
      {
        agentRunId: 'run-1',
        phase: 'merge',
        startedAt: new Date(Date.now() - 60000).toISOString(),
        completedAt: new Date(Date.now() - 30000).toISOString(),
        durationMs: 30000,
        // waitingApprovalAt set but approvalWaitMs absent = currently waiting
        waitingApprovalAt: new Date(Date.now() - 30000).toISOString(),
      },
    ],
    loading: false,
    error: null,
  },
};

/**
 * Second iteration waiting for approval — simulates the exact reported bug:
 * after rejecting the merge step, the agent fixed things and is now waiting
 * for merge approval again in iteration 2. The activity tab must show the
 * "awaiting" indicator for merge:2.
 */
export const SecondIterationWaitingForApproval: Story = {
  args: {
    timings: [
      // Iteration 1
      {
        agentRunId: 'run-1',
        phase: 'run:started',
        startedAt: new Date(Date.now() - 300000).toISOString(),
        durationMs: 0,
      },
      {
        agentRunId: 'run-1',
        phase: 'analyze',
        startedAt: new Date(Date.now() - 299000).toISOString(),
        completedAt: new Date(Date.now() - 285000).toISOString(),
        durationMs: 14000,
      },
      {
        agentRunId: 'run-1',
        phase: 'implement',
        startedAt: new Date(Date.now() - 285000).toISOString(),
        completedAt: new Date(Date.now() - 240000).toISOString(),
        durationMs: 45000,
      },
      {
        agentRunId: 'run-1',
        phase: 'merge',
        startedAt: new Date(Date.now() - 240000).toISOString(),
        completedAt: new Date(Date.now() - 210000).toISOString(),
        durationMs: 30000,
        waitingApprovalAt: new Date(Date.now() - 210000).toISOString(),
        approvalWaitMs: 15000,
      },
      {
        agentRunId: 'run-1',
        phase: 'run:rejected',
        startedAt: new Date(Date.now() - 195000).toISOString(),
        durationMs: 0,
      },
      // Iteration 2
      {
        agentRunId: 'run-1',
        phase: 'run:resumed',
        startedAt: new Date(Date.now() - 180000).toISOString(),
        durationMs: 0,
      },
      {
        agentRunId: 'run-1',
        phase: 'implement:2',
        startedAt: new Date(Date.now() - 180000).toISOString(),
        completedAt: new Date(Date.now() - 60000).toISOString(),
        durationMs: 120000,
      },
      {
        agentRunId: 'run-1',
        phase: 'merge:2',
        startedAt: new Date(Date.now() - 60000).toISOString(),
        completedAt: new Date(Date.now() - 30000).toISOString(),
        durationMs: 30000,
        // Currently waiting — approvalWaitMs absent
        waitingApprovalAt: new Date(Date.now() - 30000).toISOString(),
      },
    ],
    rejectionFeedback: [
      {
        iteration: 1,
        message: 'The PR has merge conflicts — rebase on main first',
        phase: 'merge',
        timestamp: new Date(Date.now() - 195000).toISOString(),
      },
    ],
    loading: false,
    error: null,
  },
};
