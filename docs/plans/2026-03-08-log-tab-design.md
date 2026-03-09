# Log Tab Design — Replace Messages Tab

**Date:** 2026-03-08
**Status:** Approved

## Summary

Replace the "Messages" tab in the feature drawer with a terminal-style "Log" tab that live-streams agent execution logs via SSE, matching the experience of `shep feat logs featureId -f`.

## Components

### 1. SSE Endpoint: `/api/feature-logs/route.ts`

- Accepts `?featureId=X`
- Resolves feature → gets `agentRunId` → reads `~/.shep/logs/worker-{agentRunId}.log`
- Streams existing content + watches for new lines via `fs.watch()`
- Heartbeat every 30s
- Modeled after existing `/api/deployment-logs/route.ts`

### 2. Hook: `use-feature-logs.ts`

- Opens `EventSource` to `/api/feature-logs?featureId=X`
- Accumulates log lines in state
- Manages connection lifecycle (connected/disconnected/error)
- Modeled after existing `use-deployment-logs.ts`

### 3. Component: `log-tab.tsx`

- Terminal-style: dark background, monospace font
- Auto-scrolls to bottom as new lines arrive
- User can scroll up to pause auto-follow, scroll to bottom to resume
- Connection status indicator
- Loading/error/empty states

### 4. Tab Config Changes

- Rename "Messages" → "Log" in `feature-drawer-tabs.tsx`
- Remove messages from lazy-fetch pattern (SSE-driven instead)
- Remove `get-feature-messages.ts` server action usage

## Data Flow

```
Log file on disk → /api/feature-logs (SSE + fs.watch) → EventSource → use-feature-logs → log-tab.tsx
```

## What Gets Removed

- `messages-tab.tsx` → replaced by `log-tab.tsx`
- `get-feature-messages.ts` server action → unused
- Messages-related fetching in `use-tab-data-fetch.ts`
