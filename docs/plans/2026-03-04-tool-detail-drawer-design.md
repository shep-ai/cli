# Tool Detail Drawer + Install Log Streaming

**Date**: 2026-03-04
**Status**: Approved

## Summary

Replace the plain InstallInstructions dialog with a rich Tool Detail Drawer that shows install commands for all tools (installed or not), streams installation logs in real-time via SSE, and matches the app's design language.

## Changes

### 1. New SSE Endpoint: `GET /api/tools/[id]/install/stream`

- Triggers `InstallToolUseCase.execute(id, onOutput)` (or directly `toolInstallerService.executeInstall`)
- Pipes `onOutput` chunks as SSE `data:` events
- Sends `event: done` with JSON `ToolInstallationStatus` payload on completion
- Sets `Content-Type: text/event-stream`, `Cache-Control: no-cache`, `Connection: keep-alive`

### 2. New Component: `ToolDetailDrawer`

Replaces `InstallInstructions` dialog. Uses `BaseDrawer` pattern (right-slide).

**Sections:**

- **Header**: Tool icon + name + tag badges + status badge (installed/missing/error)
- **Description**: Full tool.description text
- **Install Command**: Dark terminal block (zinc-900 bg, mono font) with copy button. Always visible.
- **Action Bar**: Install button (for missing + autoInstall tools). Launch button (for installed + launchable tools).
- **Install Log**: Terminal-style log viewer. Shows during/after installation. Auto-scrolls. Streams via SSE.
- **Documentation**: External link button

### 3. Tool Card Changes

- Add small "View command" icon button (Info or Eye icon) — visible on all cards
- Clicking opens ToolDetailDrawer
- During install: card shows "Installing..." with option to click into drawer for logs
- Remove InstallInstructions component (replaced by drawer)

### 4. Custom Hook: `useToolInstallStream`

- Manages EventSource connection to SSE endpoint
- Exposes: `{ logs: string[], status: 'idle' | 'streaming' | 'done' | 'error', result: ToolInstallationStatus | null, startInstall: () => void }`
- Auto-closes EventSource on unmount or completion

## Design Language

- Terminal blocks: `bg-zinc-900 text-zinc-100 font-mono text-xs`
- Status badges: emerald (installed), amber (missing), red (error)
- Drawer: right-slide, sm width, consistent with BaseDrawer
- Animations: fade-in for log lines, auto-scroll to bottom
