import type { Meta, StoryObj } from '@storybook/react';
import { EventLogViewer } from './event-log-viewer';

const meta: Meta<typeof EventLogViewer> = {
  title: 'Drawers/Feature/Tabs/EventLogViewer',
  component: EventLogViewer,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
  },
  decorators: [
    (Story) => (
      <div
        style={{
          height: '600px',
          width: '480px',
          border: '1px solid var(--color-border)',
          overflow: 'auto',
        }}
      >
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof EventLogViewer>;

/* ---------------------------------------------------------------------------
 * Fixtures
 * ------------------------------------------------------------------------- */

const toolEvents = `[2026-03-08T10:00:08.234Z] [requirements] [claude-code|claude-sonnet-4-6] [tool] Read {"file_path": "src/main.ts"}
[2026-03-08T10:00:10.345Z] [requirements] [claude-code|claude-sonnet-4-6] [tool] Glob {"pattern": "src/**/*.ts"}
[2026-03-08T10:00:12.567Z] [requirements] [claude-code|claude-sonnet-4-6] [tool] Grep {"pattern": "interface.*Auth", "path": "src/"}
[2026-03-08T10:00:14.789Z] [requirements] [claude-code|claude-sonnet-4-6] [tool] Bash {"command": "find src -name '*.test.ts' | wc -l"}
[2026-03-08T10:00:16.012Z] [implement] [claude-code|claude-sonnet-4-6] [tool] Write {"file_path": "src/auth/oauth-provider.ts"}
[2026-03-08T10:00:18.234Z] [implement] [claude-code|claude-sonnet-4-6] [tool] Edit {"file_path": "src/auth/index.ts"}
[2026-03-08T10:00:20.456Z] [implement] [claude-code|claude-sonnet-4-6] [tool] Task {"description": "Run integration tests"}`;

const textEvents = `[2026-03-08T10:00:10.345Z] [requirements] [claude-code|claude-sonnet-4-6] [text] Analyzing the codebase structure and identifying key entry points for the authentication module
[2026-03-08T10:00:18.234Z] [requirements] [claude-code|claude-sonnet-4-6] [text] The project uses a clean architecture pattern with dependency injection
[2026-03-08T10:02:38.200Z] [plan] [claude-code|claude-sonnet-4-6] [text] Creating implementation plan with TDD approach as required by project conventions
[2026-03-08T10:05:30.000Z] [implement] [claude-code|claude-sonnet-4-6] [text] All 14 unit tests passing. Moving to integration tests`;

const workerEvents = `[2026-03-08T10:00:01.000Z] [claude-code|claude-sonnet-4-6] [WORKER] Starting worker — full command:
[2026-03-08T10:00:01.001Z] [claude-code|claude-sonnet-4-6] [WORKER]   feature-agent-worker --feature-id auth-module --run-id run-123
[2026-03-08T10:00:01.010Z] [claude-code|claude-sonnet-4-6] [WORKER] Initializing container...
[2026-03-08T10:00:01.050Z] [claude-code|claude-sonnet-4-6] [WORKER] Creating executor from pinned agent type: claude-code
[2026-03-08T10:00:01.100Z] [claude-code|claude-sonnet-4-6] [WORKER] Updating status to running (PID 54321)...
[2026-03-08T10:06:00.000Z] [claude-code|claude-sonnet-4-6] [WORKER] Graph invocation completed. Error: none
[2026-03-08T10:06:00.100Z] [claude-code|claude-sonnet-4-6] [WORKER] Run marked as completed
[2026-03-08T10:06:00.200Z] [claude-code|claude-sonnet-4-6] [WORKER] Worker completed successfully, exiting.`;

const resultAndTokenEvents = `[2026-03-08T10:00:45.789Z] [requirements] [claude-code|claude-sonnet-4-6] [result] 8920 chars, session=sess-abc123def456
[2026-03-08T10:00:45.790Z] [requirements] [claude-code|claude-sonnet-4-6] [tokens] 2450 in / 4560 out
[2026-03-08T10:03:15.234Z] [plan] [claude-code|claude-sonnet-4-6] [result] 12345 chars, session=sess-abc123def456
[2026-03-08T10:03:15.235Z] [plan] [claude-code|claude-sonnet-4-6] [tokens] 8900 in / 3456 out
[2026-03-08T10:05:55.000Z] [implement] [claude-code|claude-sonnet-4-6] [result] 24560 chars, session=sess-abc123def456
[2026-03-08T10:05:55.001Z] [implement] [claude-code|claude-sonnet-4-6] [tokens] 15200 in / 9360 out`;

const mixedContent = `[2026-03-08T10:00:01.000Z] [claude-code|claude-sonnet-4-6] [WORKER] Starting worker — full command:
[2026-03-08T10:00:01.010Z] [claude-code|claude-sonnet-4-6] [WORKER] Initializing container...
[2026-03-08T10:00:05.000Z] [requirements] [claude-code|claude-sonnet-4-6] Starting...
[2026-03-08T10:00:08.234Z] [requirements] [claude-code|claude-sonnet-4-6] [tool] Read {"file_path": "src/main.ts"}
[2026-03-08T10:00:10.345Z] [requirements] [claude-code|claude-sonnet-4-6] [text] Analyzing the codebase structure
[2026-03-08T10:00:12.567Z] [requirements] [claude-code|claude-sonnet-4-6] [tool] Bash {"command": "pnpm test:unit"}
[2026-03-08T10:00:45.789Z] [requirements] [claude-code|claude-sonnet-4-6] [result] 8920 chars, session=sess-abc123
[2026-03-08T10:00:45.790Z] [requirements] [claude-code|claude-sonnet-4-6] [tokens] 2450 in / 4560 out
Some unstructured output that doesn't match the format
Another raw line from stderr
[2026-03-08T10:02:30.100Z] [plan] [claude-code|claude-sonnet-4-6] Starting...
[2026-03-08T10:02:35.100Z] [plan] [claude-code|claude-sonnet-4-6] [tool] Write {"file_path": "specs/001-auth/plan.yaml"}
[2026-03-08T10:03:15.234Z] [plan] [claude-code|claude-sonnet-4-6] [result] 12345 chars, session=sess-abc123
[2026-03-08T10:03:15.235Z] [plan] [claude-code|claude-sonnet-4-6] [tokens] 8900 in / 3456 out`;

/* ---------------------------------------------------------------------------
 * Stories
 * ------------------------------------------------------------------------- */

/** ToolCalls — various tool call types */
export const ToolCalls: Story = {
  args: { content: toolEvents },
};

/** TextMessages — agent thinking/analysis */
export const TextMessages: Story = {
  args: { content: textEvents },
};

/** WorkerLifecycle — worker bootstrap and shutdown */
export const WorkerLifecycle: Story = {
  args: { content: workerEvents },
};

/** ResultsAndTokens — completion summaries */
export const ResultsAndTokens: Story = {
  args: { content: resultAndTokenEvents },
};

/** MixedContent — all event types including raw fallback */
export const MixedContent: Story = {
  args: { content: mixedContent },
};

/** EmptyContent — no content */
export const EmptyContent: Story = {
  args: { content: '' },
};
