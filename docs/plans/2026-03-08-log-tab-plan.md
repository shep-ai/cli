# Log Tab Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the "Messages" tab with a terminal-style "Log" tab that live-streams agent execution logs via SSE.

**Architecture:** New SSE API route reads the log file from disk and streams it. A React hook connects via EventSource. The log-tab component renders lines in a dark terminal style with auto-scroll. The existing messages tab, server action, and storybook mock are removed.

**Tech Stack:** Next.js API route (SSE), React (EventSource hook), Node.js fs (file watching), Tailwind CSS

---

### Task 1: Create SSE API Route for Feature Logs

**Files:**

- Create: `src/presentation/web/app/api/feature-logs/route.ts`

**Step 1: Create the SSE endpoint**

```typescript
/**
 * SSE API Route: GET /api/feature-logs
 *
 * Streams agent execution log file to the client via Server-Sent Events.
 * Reads the log file from ~/.shep/logs/worker-{agentRunId}.log,
 * sends existing content, then watches for new lines via fs.watch().
 *
 * - Accepts ?featureId query parameter (required)
 * - Sends log lines as SSE "log" events
 * - Sends heartbeat comments every 30 seconds
 * - Cleans up file watcher on client disconnect
 */

import { resolve } from '@/lib/server-container';
import type { IFeatureRepository } from '@shepai/core/application/ports/output/repositories/feature-repository.interface';
import { existsSync, statSync, readFileSync, watch, openSync, readSync, closeSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

export const dynamic = 'force-dynamic';

const HEARTBEAT_INTERVAL_MS = 30_000;

export function GET(request: Request): Response {
  try {
    const url = new URL(request.url);
    const featureId = url.searchParams.get('featureId');

    if (!featureId?.trim()) {
      return sseError('featureId is required');
    }

    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        const encoder = new TextEncoder();
        let stopped = false;

        function enqueue(text: string) {
          if (stopped) return;
          try {
            controller.enqueue(encoder.encode(text));
          } catch {
            // Stream may be closed
          }
        }

        // Resolve feature to get agentRunId
        let logPath: string;
        try {
          const repo = resolve<IFeatureRepository>('IFeatureRepository');
          const feature = await repo.findById(featureId);
          if (!feature) {
            enqueue(`event: error\ndata: ${JSON.stringify({ error: 'Feature not found' })}\n\n`);
            controller.close();
            return;
          }
          if (!feature.agentRunId) {
            enqueue(
              `event: error\ndata: ${JSON.stringify({ error: 'Feature has no agent run' })}\n\n`
            );
            controller.close();
            return;
          }
          logPath = join(homedir(), '.shep', 'logs', `worker-${feature.agentRunId}.log`);
        } catch (error) {
          enqueue(`event: error\ndata: ${JSON.stringify({ error: String(error) })}\n\n`);
          controller.close();
          return;
        }

        // Send existing log content
        let position = 0;
        if (existsSync(logPath)) {
          const content = readFileSync(logPath, 'utf-8');
          if (content.length > 0) {
            // Send existing content as a single "initial" event
            enqueue(`event: initial\ndata: ${JSON.stringify({ content })}\n\n`);
            position = statSync(logPath).size;
          }
        }

        // Watch for new content
        let watcher: ReturnType<typeof watch> | null = null;
        let fallbackInterval: ReturnType<typeof setInterval> | null = null;

        const readNewContent = () => {
          if (stopped || !existsSync(logPath)) return;
          try {
            const currentSize = statSync(logPath).size;
            if (currentSize <= position) return;

            const bytesToRead = currentSize - position;
            const buf = Buffer.alloc(bytesToRead);
            const fd = openSync(logPath, 'r');
            readSync(fd, buf, 0, bytesToRead, position);
            closeSync(fd);
            position = currentSize;

            const text = buf.toString('utf-8');
            enqueue(`event: log\ndata: ${JSON.stringify({ content: text })}\n\n`);
          } catch {
            // File may have been deleted/rotated
          }
        };

        if (existsSync(logPath)) {
          watcher = watch(logPath, { persistent: false }, () => {
            readNewContent();
          });
        }

        // Fallback poll every 2s (file may not exist yet, or fs.watch misses events)
        fallbackInterval = setInterval(() => {
          if (!existsSync(logPath) || stopped) return;
          if (!watcher) {
            // File appeared — start watching
            watcher = watch(logPath, { persistent: false }, () => {
              readNewContent();
            });
            // Also read initial content now that file exists
            const content = readFileSync(logPath, 'utf-8');
            if (content.length > 0) {
              enqueue(`event: initial\ndata: ${JSON.stringify({ content })}\n\n`);
              position = statSync(logPath).size;
            }
          }
          readNewContent();
        }, 2000);

        // Heartbeat
        const heartbeatInterval = setInterval(() => {
          enqueue(': heartbeat\n\n');
        }, HEARTBEAT_INTERVAL_MS);

        // Cleanup on disconnect
        const cleanup = () => {
          stopped = true;
          watcher?.close();
          if (fallbackInterval) clearInterval(fallbackInterval);
          clearInterval(heartbeatInterval);
          try {
            controller.close();
          } catch {
            // Stream may already be closed
          }
        };

        request.signal.addEventListener('abort', cleanup, { once: true });
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('[SSE route] GET /api/feature-logs error:', error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

function sseError(message: string): Response {
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const encoder = new TextEncoder();
      controller.enqueue(
        encoder.encode(`event: error\ndata: ${JSON.stringify({ error: message })}\n\n`)
      );
      controller.close();
    },
  });
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
```

**Step 2: Verify no lint issues**

Run: `pnpm lint:fix`

**Step 3: Commit**

```
feat(web): add sse api route for feature log streaming
```

---

### Task 2: Create `use-feature-logs` Hook

**Files:**

- Create: `src/presentation/web/hooks/use-feature-logs.ts`

**Step 1: Create the hook**

```typescript
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

export interface UseFeatureLogsResult {
  /** Accumulated log content */
  content: string;
  /** Whether the EventSource is connected */
  isConnected: boolean;
  /** Error message if connection failed */
  error: string | null;
}

export function useFeatureLogs(featureId: string | null | undefined): UseFeatureLogsResult {
  const [content, setContent] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  const cleanup = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    setIsConnected(false);
  }, []);

  useEffect(() => {
    if (!featureId) {
      setContent('');
      setIsConnected(false);
      setError(null);
      return;
    }

    // Reset state for new connection
    setContent('');
    setError(null);

    const es = new EventSource(`/api/feature-logs?featureId=${encodeURIComponent(featureId)}`);
    eventSourceRef.current = es;

    es.onopen = () => {
      setIsConnected(true);
      setError(null);
    };

    es.addEventListener('initial', (event: MessageEvent) => {
      const data = JSON.parse(event.data) as { content: string };
      setContent(data.content);
    });

    es.addEventListener('log', (event: MessageEvent) => {
      const data = JSON.parse(event.data) as { content: string };
      setContent((prev) => prev + data.content);
    });

    es.addEventListener('error', (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data) as { error: string };
        setError(data.error);
      } catch {
        // Not a JSON error event — just a connection error
      }
    });

    es.onerror = () => {
      setIsConnected(false);
    };

    return () => {
      es.close();
      eventSourceRef.current = null;
    };
  }, [featureId, cleanup]);

  return { content, isConnected, error };
}
```

**Step 2: Verify no lint issues**

Run: `pnpm lint:fix`

**Step 3: Commit**

```
feat(web): add use-feature-logs hook for sse log streaming
```

---

### Task 3: Create `log-tab` Component

**Files:**

- Create: `src/presentation/web/components/common/feature-drawer-tabs/log-tab.tsx`

**Step 1: Create the component**

Terminal-style log viewer with:

- Dark background (`bg-zinc-950`), monospace font
- Auto-scroll to bottom on new content
- User can scroll up to pause auto-follow
- Connection status dot (green=connected, gray=disconnected)
- Loading/error/empty states

```typescript
'use client';

import { useRef, useEffect, useState } from 'react';
import { AlertCircle, Terminal } from 'lucide-react';

export interface LogTabProps {
  content: string;
  isConnected: boolean;
  error: string | null;
}

export function LogTab({ content, isConnected, error }: LogTabProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);

  // Auto-scroll to bottom when new content arrives
  useEffect(() => {
    if (autoScroll && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [content, autoScroll]);

  // Detect scroll position to pause/resume auto-follow
  const handleScroll = () => {
    const el = containerRef.current;
    if (!el) return;
    const isAtBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
    setAutoScroll(isAtBottom);
  };

  if (error) {
    return (
      <div className="flex items-center gap-2 p-4 text-sm text-red-600">
        <AlertCircle className="h-4 w-4 shrink-0" />
        <span>{error}</span>
      </div>
    );
  }

  if (!content) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 p-8">
        <Terminal className="text-muted-foreground h-8 w-8" />
        <p className="text-muted-foreground text-sm">No log output yet</p>
        {isConnected ? (
          <p className="text-muted-foreground text-xs">Waiting for log data...</p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col" data-testid="log-tab">
      {/* Status bar */}
      <div className="flex items-center gap-2 border-b px-3 py-1.5">
        <span
          className={`h-2 w-2 rounded-full ${isConnected ? 'bg-emerald-500' : 'bg-zinc-400'}`}
          title={isConnected ? 'Connected' : 'Disconnected'}
        />
        <span className="text-muted-foreground text-xs">
          {isConnected ? 'Live' : 'Disconnected'}
        </span>
        {!autoScroll ? (
          <button
            type="button"
            className="text-primary ml-auto text-xs hover:underline"
            onClick={() => {
              setAutoScroll(true);
              if (containerRef.current) {
                containerRef.current.scrollTop = containerRef.current.scrollHeight;
              }
            }}
          >
            Jump to bottom
          </button>
        ) : null}
      </div>

      {/* Log content */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto bg-zinc-950 p-3 font-mono text-xs leading-relaxed text-zinc-300 whitespace-pre-wrap break-all"
      >
        {content}
      </div>
    </div>
  );
}
```

**Step 2: Verify no lint issues**

Run: `pnpm lint:fix`

**Step 3: Commit**

```
feat(web): add terminal-style log-tab component
```

---

### Task 4: Create `log-tab.stories.tsx`

**Files:**

- Create: `src/presentation/web/components/common/feature-drawer-tabs/log-tab.stories.tsx`

**Step 1: Create stories**

```typescript
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

const sampleLog = `[2026-03-08T10:00:01.123Z] Starting agent run for feature "auth-module"
[2026-03-08T10:00:01.456Z] Resolving agent executor: claude-code
[2026-03-08T10:00:02.789Z] Agent started — analyzing codebase
[2026-03-08T10:00:05.012Z] Found 42 source files, 15 test files
[2026-03-08T10:00:06.345Z] Phase: requirements — gathering context
[2026-03-08T10:00:10.678Z] Generated 3 requirement questions
[2026-03-08T10:00:10.901Z] Waiting for user approval...
[2026-03-08T10:01:15.234Z] User approved requirements
[2026-03-08T10:01:15.567Z] Phase: research — analyzing tech stack
[2026-03-08T10:01:20.890Z] Identified frameworks: React, TypeScript, Tailwind
[2026-03-08T10:01:25.123Z] Phase: planning — creating implementation plan
[2026-03-08T10:01:30.456Z] Generated 5-phase plan with 12 tasks
[2026-03-08T10:01:30.789Z] Phase: implementation — executing plan
[2026-03-08T10:01:35.012Z] Task 1/12: Setting up auth providers
[2026-03-08T10:02:00.345Z] Task 1/12: Complete
[2026-03-08T10:02:00.678Z] Task 2/12: Creating OAuth callback handler
[2026-03-08T10:02:30.901Z] Task 2/12: Complete
[2026-03-08T10:02:31.234Z] Task 3/12: Adding refresh token support`;

const longLog = Array.from({ length: 200 }, (_, i) =>
  `[2026-03-08T10:${String(Math.floor(i / 60)).padStart(2, '0')}:${String(i % 60).padStart(2, '0')}.000Z] Processing step ${i + 1} — generating code for module ${i + 1}`
).join('\n');

/** Default — typical agent log output, connected. */
export const Default: Story = {
  args: {
    content: sampleLog,
    isConnected: true,
    error: null,
  },
};

/** Long log — tests scrolling behavior with many lines. */
export const LongLog: Story = {
  args: {
    content: longLog,
    isConnected: true,
    error: null,
  },
};

/** Disconnected — log content present but SSE connection lost. */
export const Disconnected: Story = {
  args: {
    content: sampleLog,
    isConnected: false,
    error: null,
  },
};

/** Empty — no log output yet, connected. */
export const Empty: Story = {
  args: {
    content: '',
    isConnected: true,
    error: null,
  },
};

/** Empty disconnected — no log output, not connected. */
export const EmptyDisconnected: Story = {
  args: {
    content: '',
    isConnected: false,
    error: null,
  },
};

/** Error — failed to connect or load logs. */
export const Error: Story = {
  args: {
    content: '',
    isConnected: false,
    error: 'Feature has no agent run',
  },
};
```

**Step 2: Verify storybook builds**

Run: `pnpm lint:fix`

**Step 3: Commit**

```
feat(web): add log-tab storybook stories
```

---

### Task 5: Wire Log Tab into Feature Drawer Tabs

**Files:**

- Modify: `src/presentation/web/components/common/feature-drawer-tabs/feature-drawer-tabs.tsx`
- Modify: `src/presentation/web/components/common/control-center-drawer/drawer-view.ts`

**Step 1: Update `drawer-view.ts` — rename `messages` to `log` in `FeatureTabKey`**

Change `'messages'` to `'log'` in the `FeatureTabKey` type union.

**Step 2: Update `feature-drawer-tabs.tsx`**

1. Remove `MessagesTab` import, `getFeatureMessages` import, `MessageData` import
2. Add `LogTab` import and `useFeatureLogs` import
3. Remove `messages` from `LazyTabKey` (now `'activity' | 'plan'`)
4. Rename tab label from `'Messages'` to `'Log'` and key from `'messages'` to `'log'` in `ALL_TABS`
5. Update `computeVisibleTabs` — replace `'messages'` with `'log'`
6. Remove `fetchMessages` function and its entry in `TAB_FETCHERS`
7. Remove messages from SSE refresh effect and `handleTabChange` (log is SSE-driven via its own hook, not via `useTabDataFetch`)
8. Replace the messages `TabsContent` with the log `TabsContent` using `useFeatureLogs` hook
9. Call `useFeatureLogs(featureId)` at the top of the component

**Step 3: Verify changes compile**

Run: `pnpm lint:fix`

**Step 4: Commit**

```
feat(web): wire log tab into feature drawer replacing messages tab
```

---

### Task 6: Update Stories and Storybook Mocks

**Files:**

- Modify: `src/presentation/web/components/common/feature-drawer-tabs/feature-drawer-tabs.stories.tsx`
- Delete: `src/presentation/web/components/common/feature-drawer-tabs/messages-tab.stories.tsx`
- Delete: `.storybook/mocks/app/actions/get-feature-messages.ts`

**Step 1: Update `feature-drawer-tabs.stories.tsx`**

Remove any references to messages tab. The stories comment about "Messages" tabs showing error states should be updated to mention "Log" tab. Since the log tab uses a hook (useFeatureLogs) that connects to EventSource, in storybook it will show the empty/disconnected state — which is fine.

**Step 2: Delete `messages-tab.stories.tsx`**

The component no longer exists.

**Step 3: Delete storybook mock for `get-feature-messages.ts`**

No longer needed since we're not using the server action.

**Step 4: Verify storybook builds**

Run: `pnpm lint:fix`

**Step 5: Commit**

```
chore(web): update stories and remove messages tab artifacts
```

---

### Task 7: Clean Up Removed Files

**Files:**

- Delete: `src/presentation/web/components/common/feature-drawer-tabs/messages-tab.tsx`
- Modify: `src/presentation/web/app/actions/get-feature-messages.ts` — keep file but note it may still be imported elsewhere; check for remaining imports

**Step 1: Check for remaining imports of messages-tab and get-feature-messages**

Run: `grep -r "messages-tab\|get-feature-messages\|MessagesTab\|getFeatureMessages" src/presentation/web/ --include="*.ts" --include="*.tsx" -l`

If no remaining imports reference `get-feature-messages` or `messages-tab` (other than the files being deleted), delete them. If something else imports `get-feature-messages`, keep it.

**Step 2: Delete `messages-tab.tsx`**

**Step 3: Delete `get-feature-messages.ts` server action** (if no other imports)

**Step 4: Verify full build**

Run: `pnpm validate`

**Step 5: Commit**

```
refactor(web): remove unused messages tab and server action
```

---

### Task 8: Verify Everything Works

**Step 1: Run full validation**

Run: `pnpm validate`
Expected: All checks pass (lint, format, typecheck, tsp)

**Step 2: Run unit tests**

Run: `pnpm test:unit`
Expected: All tests pass

**Step 3: Verify storybook builds**

Run: `pnpm build:storybook` (if available) or check that stories render

**Step 4: Manual verification notes**

- Start web UI with `pnpm dev:web`
- Open a feature drawer
- Click the "Log" tab
- Should see empty state or terminal-style log output
- If agent is running, log should stream in real-time
