# Tool Detail Drawer Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the plain install dialog with a rich drawer showing install commands, real-time install logs via SSE, and matching the app's design language.

**Architecture:** SSE endpoint pipes `executeInstall` output chunks to the client. A custom hook manages EventSource lifecycle. The drawer component uses BaseDrawer and follows ServerLogViewer patterns for the terminal log display.

**Tech Stack:** Next.js API routes (SSE), React hooks (EventSource), BaseDrawer (vaul), lucide-react icons, Tailwind CSS

---

### Task 1: SSE Install Stream Endpoint

**Files:**

- Create: `src/presentation/web/app/api/tools/[id]/install/stream/route.ts`
- Test: `tests/unit/presentation/web/api/tools-install-stream.test.ts`

**Step 1: Write the failing test**

```typescript
// tests/unit/presentation/web/api/tools-install-stream.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockExecute = vi.fn();

vi.mock('../../../../src/lib/server-container', () => ({
  resolve: vi.fn(() => ({ execute: mockExecute })),
}));

describe('GET /api/tools/[id]/install/stream', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns SSE content-type headers', async () => {
    mockExecute.mockResolvedValue({ status: 'available', toolName: 'tmux' });

    const { GET } = await import(
      '../../../../src/presentation/web/app/api/tools/[id]/install/stream/route'
    );

    const response = await GET(new Request('http://localhost/api/tools/tmux/install/stream'), {
      params: Promise.resolve({ id: 'tmux' }),
    });

    expect(response.headers.get('Content-Type')).toBe('text/event-stream');
    expect(response.headers.get('Cache-Control')).toBe('no-cache');
    expect(response.headers.get('Connection')).toBe('keep-alive');
  });

  it('streams output events and done event', async () => {
    mockExecute.mockImplementation(async (toolName: string, onOutput?: (data: string) => void) => {
      onOutput?.('Installing tmux...\n');
      onOutput?.('Done.\n');
      return { status: 'available', toolName };
    });

    const { GET } = await import(
      '../../../../src/presentation/web/app/api/tools/[id]/install/stream/route'
    );

    const response = await GET(new Request('http://localhost/api/tools/tmux/install/stream'), {
      params: Promise.resolve({ id: 'tmux' }),
    });

    const text = await response.text();
    expect(text).toContain('data: Installing tmux...');
    expect(text).toContain('event: done');
    expect(text).toContain('"status":"available"');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm test:unit -- --testPathPattern="tools-install-stream"`
Expected: FAIL — module not found

**Step 3: Write the SSE route**

```typescript
// src/presentation/web/app/api/tools/[id]/install/stream/route.ts
import { resolve } from '@/lib/server-container';
import type { InstallToolUseCase } from '@shepai/core/application/use-cases/tools/install-tool.use-case';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const { id } = await params;
  const useCase = resolve<InstallToolUseCase>('InstallToolUseCase');

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const status = await useCase.execute(id, (chunk: string) => {
          controller.enqueue(encoder.encode(`data: ${chunk.replace(/\n/g, '\ndata: ')}\n\n`));
        });
        controller.enqueue(encoder.encode(`event: done\ndata: ${JSON.stringify(status)}\n\n`));
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Installation failed';
        controller.enqueue(
          encoder.encode(
            `event: done\ndata: ${JSON.stringify({ status: 'error', toolName: id, errorMessage: message })}\n\n`
          )
        );
      } finally {
        controller.close();
      }
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

**Step 4: Run test to verify it passes**

Run: `pnpm test:unit -- --testPathPattern="tools-install-stream"`
Expected: PASS

**Step 5: Commit**

```
feat(web): add sse endpoint for tool install streaming
```

---

### Task 2: `useToolInstallStream` Hook

**Files:**

- Create: `src/presentation/web/hooks/use-tool-install-stream.ts`
- Test: `tests/unit/presentation/web/hooks/use-tool-install-stream.test.ts`

**Step 1: Write the failing test**

```typescript
// tests/unit/presentation/web/hooks/use-tool-install-stream.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useToolInstallStream } from '../../../../src/presentation/web/hooks/use-tool-install-stream';

// Mock EventSource
class MockEventSource {
  static instances: MockEventSource[] = [];
  url: string;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  listeners: Record<string, ((event: MessageEvent) => void)[]> = {};
  readyState = 0;

  constructor(url: string) {
    this.url = url;
    MockEventSource.instances.push(this);
    setTimeout(() => {
      this.readyState = 1;
    }, 0);
  }

  addEventListener(type: string, listener: (event: MessageEvent) => void) {
    if (!this.listeners[type]) this.listeners[type] = [];
    this.listeners[type].push(listener);
  }

  removeEventListener(type: string, listener: (event: MessageEvent) => void) {
    if (this.listeners[type]) {
      this.listeners[type] = this.listeners[type].filter((l) => l !== listener);
    }
  }

  close = vi.fn();

  // Test helpers
  simulateMessage(data: string) {
    this.onmessage?.(new MessageEvent('message', { data }));
  }

  simulateEvent(type: string, data: string) {
    this.listeners[type]?.forEach((l) => l(new MessageEvent(type, { data })));
  }
}

describe('useToolInstallStream', () => {
  beforeEach(() => {
    MockEventSource.instances = [];
    vi.stubGlobal('EventSource', MockEventSource);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('starts in idle state', () => {
    const { result } = renderHook(() => useToolInstallStream('tmux'));
    expect(result.current.status).toBe('idle');
    expect(result.current.logs).toEqual([]);
    expect(result.current.result).toBeNull();
  });

  it('connects to SSE endpoint on startInstall', () => {
    const { result } = renderHook(() => useToolInstallStream('tmux'));

    act(() => {
      result.current.startInstall();
    });

    expect(result.current.status).toBe('streaming');
    expect(MockEventSource.instances).toHaveLength(1);
    expect(MockEventSource.instances[0].url).toBe('/api/tools/tmux/install/stream');
  });

  it('appends log lines from SSE data events', () => {
    const { result } = renderHook(() => useToolInstallStream('tmux'));

    act(() => {
      result.current.startInstall();
    });

    const es = MockEventSource.instances[0];
    act(() => {
      es.simulateMessage('Installing tmux...');
    });
    act(() => {
      es.simulateMessage('Done.');
    });

    expect(result.current.logs).toEqual(['Installing tmux...', 'Done.']);
  });

  it('transitions to done on done event', () => {
    const { result } = renderHook(() => useToolInstallStream('tmux'));

    act(() => {
      result.current.startInstall();
    });

    const es = MockEventSource.instances[0];
    act(() => {
      es.simulateEvent('done', JSON.stringify({ status: 'available', toolName: 'tmux' }));
    });

    expect(result.current.status).toBe('done');
    expect(result.current.result).toEqual({ status: 'available', toolName: 'tmux' });
    expect(es.close).toHaveBeenCalled();
  });

  it('closes EventSource on unmount', () => {
    const { result, unmount } = renderHook(() => useToolInstallStream('tmux'));

    act(() => {
      result.current.startInstall();
    });

    const es = MockEventSource.instances[0];
    unmount();
    expect(es.close).toHaveBeenCalled();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm test:unit -- --testPathPattern="use-tool-install-stream"`
Expected: FAIL — module not found

**Step 3: Write the hook**

```typescript
// src/presentation/web/hooks/use-tool-install-stream.ts
'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import type { ToolInstallationStatus } from '@shepai/core/domain/generated/output';

export type InstallStreamStatus = 'idle' | 'streaming' | 'done' | 'error';

export interface UseToolInstallStreamResult {
  logs: string[];
  status: InstallStreamStatus;
  result: ToolInstallationStatus | null;
  startInstall: () => void;
}

export function useToolInstallStream(toolId: string): UseToolInstallStreamResult {
  const [logs, setLogs] = useState<string[]>([]);
  const [status, setStatus] = useState<InstallStreamStatus>('idle');
  const [result, setResult] = useState<ToolInstallationStatus | null>(null);
  const esRef = useRef<EventSource | null>(null);

  const cleanup = useCallback(() => {
    if (esRef.current) {
      esRef.current.close();
      esRef.current = null;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => cleanup, [cleanup]);

  const startInstall = useCallback(() => {
    cleanup();
    setLogs([]);
    setResult(null);
    setStatus('streaming');

    const es = new EventSource(`/api/tools/${toolId}/install/stream`);
    esRef.current = es;

    es.onmessage = (event: MessageEvent) => {
      setLogs((prev) => [...prev, event.data]);
    };

    es.addEventListener('done', (event: MessageEvent) => {
      const installResult: ToolInstallationStatus = JSON.parse(event.data);
      setResult(installResult);
      setStatus(installResult.status === 'error' ? 'error' : 'done');
      cleanup();
    });

    es.onerror = () => {
      setStatus('error');
      cleanup();
    };
  }, [toolId, cleanup]);

  return { logs, status, result, startInstall };
}
```

**Step 4: Run test to verify it passes**

Run: `pnpm test:unit -- --testPathPattern="use-tool-install-stream"`
Expected: PASS

**Step 5: Commit**

```
feat(web): add use-tool-install-stream hook for sse install logs
```

---

### Task 3: `ToolDetailDrawer` Component

**Files:**

- Create: `src/presentation/web/components/features/tools/tool-detail-drawer.tsx`
- Create: `src/presentation/web/components/features/tools/tool-detail-drawer.stories.tsx`
- Test: `tests/unit/presentation/web/components/features/tools/tool-detail-drawer.test.tsx`

**Step 1: Write the failing test**

```typescript
// tests/unit/presentation/web/components/features/tools/tool-detail-drawer.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ToolDetailDrawer } from '../../../../../../src/presentation/web/components/features/tools/tool-detail-drawer';
import type { ToolItem } from '@shepai/core/application/use-cases/tools/list-tools.use-case';

// Mock hooks
vi.mock('../../../../../../src/presentation/web/hooks/use-tool-install-stream', () => ({
  useToolInstallStream: () => ({
    logs: [],
    status: 'idle',
    result: null,
    startInstall: vi.fn(),
  }),
}));

const mockTool: ToolItem = {
  id: 'tmux',
  name: 'tmux',
  summary: 'Terminal multiplexer',
  description: 'tmux is a terminal multiplexer for session management.',
  tags: ['terminal'],
  iconUrl: 'https://cdn.simpleicons.org/tmux',
  autoInstall: true,
  required: false,
  openDirectory: 'tmux new-session -c {dir}',
  documentationUrl: 'https://github.com/tmux/tmux/wiki',
  installCommand: 'sudo apt-get install -y tmux',
  status: { status: 'missing', toolName: 'tmux' },
};

describe('ToolDetailDrawer', () => {
  it('renders tool name and description when open', () => {
    render(<ToolDetailDrawer tool={mockTool} open={true} onClose={vi.fn()} />);
    expect(screen.getByText('tmux')).toBeDefined();
    expect(screen.getByText('tmux is a terminal multiplexer for session management.')).toBeDefined();
  });

  it('shows install command in code block', () => {
    render(<ToolDetailDrawer tool={mockTool} open={true} onClose={vi.fn()} />);
    expect(screen.getByText('sudo apt-get install -y tmux')).toBeDefined();
  });

  it('shows install button for missing autoInstall tool', () => {
    render(<ToolDetailDrawer tool={mockTool} open={true} onClose={vi.fn()} />);
    expect(screen.getByRole('button', { name: /install/i })).toBeDefined();
  });

  it('shows installed badge for available tool', () => {
    const installed = { ...mockTool, status: { status: 'available' as const, toolName: 'tmux' } };
    render(<ToolDetailDrawer tool={installed} open={true} onClose={vi.fn()} />);
    expect(screen.getByText('Installed')).toBeDefined();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm test:unit -- --testPathPattern="tool-detail-drawer.test"`
Expected: FAIL — module not found

**Step 3: Write the component**

The ToolDetailDrawer uses BaseDrawer with terminal-style code blocks matching the ServerLogViewer design language (zinc-900/950 bg, mono font, auto-scroll log area).

Key sections:

- Header with icon, name, tags, status badge
- Description text
- Install command in dark terminal block with copy button
- Install button (missing tools) or Launch button (installed tools)
- Log viewer area (visible during/after install)
- Documentation link

**Step 4: Write Storybook stories**

Stories for: Installed, Missing with autoInstall, Missing manual, Error, With logs streaming, After successful install.

**Step 5: Run test to verify it passes**

Run: `pnpm test:unit -- --testPathPattern="tool-detail-drawer.test"`
Expected: PASS

**Step 6: Commit**

```
feat(web): add tool detail drawer with install log viewer
```

---

### Task 4: Update ToolCard to Use Drawer

**Files:**

- Modify: `src/presentation/web/components/features/tools/tool-card.tsx`
- Modify: `src/presentation/web/components/features/tools/tool-card.stories.tsx`
- Modify: `src/presentation/web/components/features/tools/index.ts`
- Modify: `tests/unit/presentation/web/components/features/tools/tool-detail-drawer.test.tsx` (if needed)

**Step 1: Update tool-card.tsx**

Changes:

- Replace `InstallInstructions` with `ToolDetailDrawer`
- Add info/eye icon button to all cards (visible on hover or always) that opens the drawer
- Wire auto-install through the drawer's streaming flow
- Keep the card's Install button but have it open the drawer and auto-start install

**Step 2: Update index.ts exports**

Replace `InstallInstructions` export with `ToolDetailDrawer`.

**Step 3: Update stories**

Add story for drawer-open state. Update existing stories if props changed.

**Step 4: Run all tool-related tests**

Run: `pnpm test:unit -- --testPathPattern="tool"`
Expected: ALL PASS

**Step 5: Run storybook build**

Run: `pnpm build:storybook`
Expected: PASS

**Step 6: Commit**

```
refactor(web): replace install dialog with tool detail drawer in card
```

---

### Task 5: Delete Old InstallInstructions Component

**Files:**

- Delete: `src/presentation/web/components/features/tools/install-instructions.tsx`
- Delete: `src/presentation/web/components/features/tools/install-instructions.stories.tsx`
- Delete: `tests/unit/presentation/web/components/features/tools/install-instructions.test.tsx` (if exists)

**Step 1: Remove files**

```bash
rm src/presentation/web/components/features/tools/install-instructions.tsx
rm src/presentation/web/components/features/tools/install-instructions.stories.tsx
```

**Step 2: Verify no remaining imports**

Run: `grep -r "install-instructions" src/ tests/`
Expected: No results

**Step 3: Run full test suite**

Run: `pnpm test:unit`
Expected: ALL PASS

**Step 4: Run storybook build**

Run: `pnpm build:storybook`
Expected: PASS

**Step 5: Commit**

```
refactor(web): remove deprecated install-instructions component
```

---

### Task 6: Final Validation

**Step 1: Run full validation**

Run: `pnpm validate`
Expected: PASS (lint + format + typecheck + tsp)

**Step 2: Run all tests**

Run: `pnpm test:unit`
Expected: ALL PASS

**Step 3: Manual smoke test**

Run: `pnpm dev:web`

- Open http://localhost:4050/tools
- Verify tool cards show info icon
- Click info icon → drawer opens with command preview
- Click Install on a missing tool → logs stream in real-time
- Verify installed tools show "Installed" badge in drawer
- Verify copy button works for install command

**Step 4: Commit all remaining changes**

```
chore(web): final validation for tool detail drawer feature
```
