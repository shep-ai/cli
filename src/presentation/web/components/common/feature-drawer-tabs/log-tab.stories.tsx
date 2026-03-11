import type { Meta, StoryObj } from '@storybook/react';
import { LogTab } from './log-tab';

const meta: Meta<typeof LogTab> = {
  title: 'Drawers/Feature/Tabs/LogTab',
  component: LogTab,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
  },
  decorators: [
    (Story) => (
      <div style={{ height: '600px', width: '480px', border: '1px solid var(--color-border)' }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof LogTab>;

/* ---------------------------------------------------------------------------
 * Data fixtures
 * ------------------------------------------------------------------------- */

const structuredLogContent = `[2026-03-08T10:00:01.000Z] [claude-code|claude-sonnet-4-6] [WORKER] Starting worker — full command:
[2026-03-08T10:00:01.001Z] [claude-code|claude-sonnet-4-6] [WORKER]   feature-agent-worker --feature-id auth-module --run-id run-123 --repo /home/user/myproject --agent-type claude-code --model claude-sonnet-4-6
[2026-03-08T10:00:01.010Z] [claude-code|claude-sonnet-4-6] [WORKER] Initializing container...
[2026-03-08T10:00:01.050Z] [claude-code|claude-sonnet-4-6] [WORKER] Creating executor from pinned agent type: claude-code
[2026-03-08T10:00:01.100Z] [claude-code|claude-sonnet-4-6] [WORKER] Updating status to running (PID 54321)...
[2026-03-08T10:00:01.110Z] [claude-code|claude-sonnet-4-6] [WORKER] Starting graph invocation...
[2026-03-08T10:00:05.000Z] [requirements] [claude-code|claude-sonnet-4-6] Starting...
[2026-03-08T10:00:05.010Z] [requirements] [claude-code|claude-sonnet-4-6] Executing agent at cwd=/home/user/myproject
[2026-03-08T10:00:05.020Z] [requirements] [claude-code|claude-sonnet-4-6] Prompt length: 2847 chars
[2026-03-08T10:00:05.100Z] [requirements] [claude-code|claude-sonnet-4-6] Spawning: claude -p "Analyze this project..." --output-format stream-json --verbose
[2026-03-08T10:00:05.102Z] [requirements] [claude-code|claude-sonnet-4-6] Subprocess PID: 54322
[2026-03-08T10:00:08.234Z] [requirements] [claude-code|claude-sonnet-4-6] [tool] Read {"file_path": "src/main.ts"}
[2026-03-08T10:00:10.345Z] [requirements] [claude-code|claude-sonnet-4-6] [text] Analyzing the codebase structure and identifying key entry points for the authentication module
[2026-03-08T10:00:12.567Z] [requirements] [claude-code|claude-sonnet-4-6] [tool] Glob {"pattern": "src/**/*.ts"}
[2026-03-08T10:00:14.789Z] [requirements] [claude-code|claude-sonnet-4-6] [tool] Read {"file_path": "src/auth/providers.ts"}
[2026-03-08T10:00:16.012Z] [requirements] [claude-code|claude-sonnet-4-6] [tool] Grep {"pattern": "interface.*Auth", "path": "src/"}
[2026-03-08T10:00:18.234Z] [requirements] [claude-code|claude-sonnet-4-6] [text] The project uses a clean architecture pattern with dependency injection. I can see the auth interfaces are defined in the domain layer
[2026-03-08T10:00:20.456Z] [requirements] [claude-code|claude-sonnet-4-6] [tool] Bash {"command": "find src -name '*.test.ts' | wc -l"}
[2026-03-08T10:00:45.789Z] [requirements] [claude-code|claude-sonnet-4-6] [result] 8920 chars, session=sess-abc123def456
[2026-03-08T10:00:45.790Z] [requirements] [claude-code|claude-sonnet-4-6] [tokens] 2450 in / 4560 out
[2026-03-08T10:00:45.791Z] [requirements] [claude-code|claude-sonnet-4-6] Process closed with code 0, result=8920 chars
[2026-03-08T10:00:45.800Z] [requirements] [claude-code|claude-sonnet-4-6] Complete (8920 chars, 40.8s)
[2026-03-08T10:00:45.900Z] [requirements] [claude-code|claude-sonnet-4-6] Interrupting for human approval
[2026-03-08T10:02:30.000Z] [requirements] [claude-code|claude-sonnet-4-6] Phase approved, skipping re-execution
[2026-03-08T10:02:30.100Z] [plan] [claude-code|claude-sonnet-4-6] Starting...
[2026-03-08T10:02:30.110Z] [plan] [claude-code|claude-sonnet-4-6] Executing agent at cwd=/home/user/myproject
[2026-03-08T10:02:30.120Z] [plan] [claude-code|claude-sonnet-4-6] Prompt length: 15234 chars
[2026-03-08T10:02:35.100Z] [plan] [claude-code|claude-sonnet-4-6] [tool] Read {"file_path": "CLAUDE.md"}
[2026-03-08T10:02:38.200Z] [plan] [claude-code|claude-sonnet-4-6] [text] Creating implementation plan with TDD approach as required by project conventions
[2026-03-08T10:02:42.300Z] [plan] [claude-code|claude-sonnet-4-6] [tool] Write {"file_path": "specs/001-auth/plan.yaml"}
[2026-03-08T10:02:45.400Z] [plan] [claude-code|claude-sonnet-4-6] [text] Plan includes 3 phases: scaffold auth module, implement OAuth2 providers, add tests and documentation
[2026-03-08T10:03:15.234Z] [plan] [claude-code|claude-sonnet-4-6] [result] 12345 chars, session=sess-abc123def456
[2026-03-08T10:03:15.235Z] [plan] [claude-code|claude-sonnet-4-6] [tokens] 8900 in / 3456 out
[2026-03-08T10:03:15.300Z] [plan] [claude-code|claude-sonnet-4-6] Complete (12345 chars, 45.1s)
[2026-03-08T10:05:00.000Z] [implement] [claude-code|claude-sonnet-4-6] Starting...
[2026-03-08T10:05:01.000Z] [implement] [claude-code|claude-sonnet-4-6] [tool] Write {"file_path": "src/auth/oauth-provider.ts"}
[2026-03-08T10:05:03.000Z] [implement] [claude-code|claude-sonnet-4-6] [tool] Write {"file_path": "src/auth/token-manager.ts"}
[2026-03-08T10:05:05.000Z] [implement] [claude-code|claude-sonnet-4-6] [tool] Edit {"file_path": "src/auth/index.ts"}
[2026-03-08T10:05:07.000Z] [implement] [claude-code|claude-sonnet-4-6] [tool] Bash {"command": "pnpm test:unit"}
[2026-03-08T10:05:30.000Z] [implement] [claude-code|claude-sonnet-4-6] [text] All 14 unit tests passing. Moving to integration tests
[2026-03-08T10:05:35.000Z] [implement] [claude-code|claude-sonnet-4-6] [tool] Bash {"command": "pnpm test:int"}
[2026-03-08T10:05:55.000Z] [implement] [claude-code|claude-sonnet-4-6] [result] 24560 chars, session=sess-abc123def456
[2026-03-08T10:05:55.001Z] [implement] [claude-code|claude-sonnet-4-6] [tokens] 15200 in / 9360 out
[2026-03-08T10:05:55.100Z] [implement] [claude-code|claude-sonnet-4-6] Complete (24560 chars, 54.1s)
[2026-03-08T10:06:00.000Z] [claude-code|claude-sonnet-4-6] [WORKER] Graph invocation completed. Error: none
[2026-03-08T10:06:00.100Z] [claude-code|claude-sonnet-4-6] [WORKER] Run marked as completed
[2026-03-08T10:06:00.200Z] [claude-code|claude-sonnet-4-6] [WORKER] Worker completed successfully, exiting.`;

const rawLogContent = `[2026-03-08T10:00:01.123Z] Starting agent run for feature "auth-module"
[2026-03-08T10:00:02.789Z] Agent started — analyzing codebase
[2026-03-08T10:00:03.456Z] Scanning repository structure...
[2026-03-08T10:00:04.012Z] Found 127 source files across 14 packages
[2026-03-08T10:00:05.234Z] Identified entry points: src/index.ts, src/auth/providers.ts
[2026-03-08T10:00:06.890Z] Running dependency analysis...
[2026-03-08T10:00:08.345Z] Resolved 42 internal dependencies
[2026-03-08T10:00:09.567Z] Generating implementation plan...
[2026-03-08T10:00:11.123Z] Plan generated — 3 phases, 8 tasks
[2026-03-08T10:00:12.789Z] Phase 1: scaffold auth module structure
[2026-03-08T10:00:14.456Z] Creating src/auth/oauth-provider.ts
[2026-03-08T10:00:15.012Z] Creating src/auth/token-manager.ts
[2026-03-08T10:00:16.234Z] Phase 1 complete — 2 files created
[2026-03-08T10:00:17.890Z] Phase 2: implement OAuth2 flow
[2026-03-08T10:00:19.345Z] Writing Google OAuth provider...
[2026-03-08T10:00:21.567Z] Writing GitHub OAuth provider...
[2026-03-08T10:00:23.123Z] Phase 2 complete — providers implemented
[2026-03-08T10:00:24.789Z] Phase 3: add tests and documentation
[2026-03-08T10:00:26.456Z] Generating test suite...
[2026-03-08T10:00:28.012Z] All phases complete — feature "auth-module" ready for review`;

const longStructuredContent = Array.from({ length: 100 }, (_, i) => {
  const min = String(Math.floor(i / 60)).padStart(2, '0');
  const sec = String(i % 60).padStart(2, '0');
  const ms = String((i * 7) % 1000).padStart(3, '0');
  const ts = `2026-03-08T10:${min}:${sec}.${ms}Z`;
  const phase = ['requirements', 'research', 'plan', 'implement'][i % 4];
  const tags = ['[tool]', '[text]', '[tool]', '[text]', '[result]', '[tokens]'];
  const tag = tags[i % tags.length];
  const messages: Record<string, string[]> = {
    '[tool]': [
      'Read {"file_path": "src/components/button.tsx"}',
      'Bash {"command": "pnpm test:unit"}',
      'Grep {"pattern": "export function", "path": "src/"}',
      'Write {"file_path": "src/new-file.ts"}',
      'Glob {"pattern": "**/*.test.ts"}',
    ],
    '[text]': [
      'Analyzing the component structure for potential improvements',
      'The test suite is comprehensive with good coverage',
      'Implementing the authentication flow with OAuth2 providers',
      'Refactoring to use dependency injection pattern',
    ],
    '[result]': ['4520 chars, session=sess-xyz789'],
    '[tokens]': ['3200 in / 1800 out'],
  };
  const msgList = messages[tag] ?? messages['[text]'];
  const msg = msgList[i % msgList.length];
  return `[${ts}] [${phase}] [claude-code|claude-sonnet-4-6] ${tag} ${msg}`;
}).join('\n');

/* ---------------------------------------------------------------------------
 * Stories
 * ------------------------------------------------------------------------- */

/** Default — structured agent log output with live connection (claude-code). */
export const Default: Story = {
  args: {
    content: structuredLogContent,
    isConnected: true,
    error: null,
  },
};

/** LongStructured — 100 structured events to test scrolling behavior. */
export const LongStructured: Story = {
  args: {
    content: longStructuredContent,
    isConnected: true,
    error: null,
  },
};

/** RawFallback — unstructured log content falls back gracefully. */
export const RawFallback: Story = {
  args: {
    content: rawLogContent,
    isConnected: true,
    error: null,
  },
};

/** Disconnected — log content present but connection is lost. */
export const Disconnected: Story = {
  args: {
    content: structuredLogContent,
    isConnected: false,
    error: null,
  },
};

/** Empty — no log content yet, connected and waiting. */
export const Empty: Story = {
  args: {
    content: '',
    isConnected: true,
    error: null,
  },
};

/** EmptyDisconnected — no log content and not connected. */
export const EmptyDisconnected: Story = {
  args: {
    content: '',
    isConnected: false,
    error: null,
  },
};

/** Error — error message displayed when connection fails. */
export const Error: Story = {
  args: {
    content: '',
    isConnected: false,
    error: 'WebSocket connection lost. Unable to stream agent logs.',
  },
};
