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
      <div style={{ height: '600px', width: '400px', border: '1px solid var(--color-border)' }}>
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

const typicalLogContent = `[2026-03-08T10:00:01.123Z] Starting agent run for feature "auth-module"
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

const longLogContent = Array.from(
  { length: 200 },
  (_, i) =>
    `[2026-03-08T10:${String(Math.floor(i / 60)).padStart(2, '0')}:${String(i % 60).padStart(2, '0')}.${String((i * 7) % 1000).padStart(3, '0')}Z] Step ${i + 1}: processing task batch ${Math.floor(i / 10) + 1} — file ${i + 1} of 200`
).join('\n');

/* ---------------------------------------------------------------------------
 * Stories
 * ------------------------------------------------------------------------- */

/** Default — typical agent log output with live connection. */
export const Default: Story = {
  args: {
    content: typicalLogContent,
    isConnected: true,
    error: null,
  },
};

/** LongLog — 200 lines of log output to test scrolling behavior. */
export const LongLog: Story = {
  args: {
    content: longLogContent,
    isConnected: true,
    error: null,
  },
};

/** Disconnected — log content present but connection is lost. */
export const Disconnected: Story = {
  args: {
    content: typicalLogContent,
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
