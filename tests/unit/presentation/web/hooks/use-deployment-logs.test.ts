import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useDeploymentLogs } from '@/hooks/use-deployment-logs';

// --- Server action mock ---
const mockGetDeploymentLogs = vi.fn();

vi.mock('@/app/actions/get-deployment-logs', () => ({
  getDeploymentLogs: (...args: unknown[]) => mockGetDeploymentLogs(...args),
}));

// --- EventSource mock ---
type EventSourceListener = (event: MessageEvent) => void;

class MockEventSource {
  static instances: MockEventSource[] = [];

  url: string;
  readyState = 0; // CONNECTING
  onmessage: EventSourceListener | null = null;
  onerror: ((event: Event) => void) | null = null;
  onopen: (() => void) | null = null;
  private listeners = new Map<string, Set<EventSourceListener>>();
  closed = false;

  constructor(url: string) {
    this.url = url;
    MockEventSource.instances.push(this);
    // Schedule open for the next microtask so hook can set onopen first
    Promise.resolve().then(() => {
      if (!this.closed) {
        this.readyState = 1; // OPEN
        this.onopen?.();
      }
    });
  }

  addEventListener(type: string, listener: EventSourceListener) {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    this.listeners.get(type)!.add(listener);
  }

  removeEventListener(type: string, listener: EventSourceListener) {
    this.listeners.get(type)?.delete(listener);
  }

  close() {
    this.closed = true;
    this.readyState = 2; // CLOSED
  }

  // Test helper: dispatch a named SSE event
  _emit(type: string, data: unknown) {
    const event = new MessageEvent(type, { data: JSON.stringify(data) });
    const listeners = this.listeners.get(type);
    if (listeners) {
      for (const listener of listeners) {
        listener(event);
      }
    }
    if (type === 'message' && this.onmessage) {
      this.onmessage(event);
    }
  }

  // Test helper: trigger error
  _triggerError() {
    this.readyState = 2;
    this.onerror?.(new Event('error'));
  }

  // Test helper: simulate open (for tests that need explicit control)
  _simulateOpen() {
    this.readyState = 1;
    this.onopen?.();
  }
}

// Install mock globally
const OriginalEventSource = globalThis.EventSource;

beforeEach(() => {
  MockEventSource.instances = [];
  (globalThis as Record<string, unknown>).EventSource = MockEventSource;
});

afterEach(() => {
  (globalThis as Record<string, unknown>).EventSource = OriginalEventSource;
});

const sampleLog = {
  targetId: 'target-1',
  stream: 'stdout' as const,
  line: 'Server running on port 3000',
  timestamp: 1000,
};

const sampleStderrLog = {
  targetId: 'target-1',
  stream: 'stderr' as const,
  line: 'Warning: something happened',
  timestamp: 1001,
};

describe('useDeploymentLogs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns empty logs and disconnected initially', () => {
    mockGetDeploymentLogs.mockResolvedValue([]);

    const { result } = renderHook(() => useDeploymentLogs('target-1'));

    expect(result.current.logs).toEqual([]);
    expect(result.current.isConnected).toBe(false);
  });

  it('fetches initial logs via server action on mount', async () => {
    const initialLogs = [sampleLog];
    mockGetDeploymentLogs.mockResolvedValue(initialLogs);

    const { result } = renderHook(() => useDeploymentLogs('target-1'));

    expect(mockGetDeploymentLogs).toHaveBeenCalledWith('target-1');

    await waitFor(() => {
      expect(result.current.logs).toEqual(initialLogs);
    });
  });

  it('handles null response from initial fetch', async () => {
    mockGetDeploymentLogs.mockResolvedValue(null);

    const { result } = renderHook(() => useDeploymentLogs('target-1'));

    await waitFor(() => {
      expect(mockGetDeploymentLogs).toHaveBeenCalled();
    });

    expect(result.current.logs).toEqual([]);
  });

  it('connects EventSource to correct URL with targetId', async () => {
    mockGetDeploymentLogs.mockResolvedValue([]);

    renderHook(() => useDeploymentLogs('target-1'));

    await waitFor(() => {
      expect(MockEventSource.instances.length).toBe(1);
    });

    expect(MockEventSource.instances[0].url).toBe('/api/deployment-logs?targetId=target-1');
  });

  it('sets isConnected to true when EventSource opens', async () => {
    mockGetDeploymentLogs.mockResolvedValue([]);

    const { result } = renderHook(() => useDeploymentLogs('target-1'));

    await waitFor(() => {
      expect(result.current.isConnected).toBe(true);
    });
  });

  it('appends new SSE log events to state', async () => {
    mockGetDeploymentLogs.mockResolvedValue([sampleLog]);

    const { result } = renderHook(() => useDeploymentLogs('target-1'));

    await waitFor(() => {
      expect(result.current.logs).toEqual([sampleLog]);
    });

    act(() => {
      MockEventSource.instances[0]._emit('log', sampleStderrLog);
    });

    expect(result.current.logs).toEqual([sampleLog, sampleStderrLog]);
  });

  it('closes EventSource on unmount', async () => {
    mockGetDeploymentLogs.mockResolvedValue([]);

    const { unmount } = renderHook(() => useDeploymentLogs('target-1'));

    await waitFor(() => {
      expect(MockEventSource.instances.length).toBe(1);
    });

    const es = MockEventSource.instances[0];
    expect(es.closed).toBe(false);

    unmount();

    expect(es.closed).toBe(true);
  });

  it('sets isConnected to false on EventSource error', async () => {
    mockGetDeploymentLogs.mockResolvedValue([]);

    const { result } = renderHook(() => useDeploymentLogs('target-1'));

    await waitFor(() => {
      expect(result.current.isConnected).toBe(true);
    });

    act(() => {
      MockEventSource.instances[0]._triggerError();
    });

    expect(result.current.isConnected).toBe(false);
  });

  it('does not connect when targetId is null', () => {
    mockGetDeploymentLogs.mockResolvedValue([]);

    const { result } = renderHook(() => useDeploymentLogs(null));

    expect(result.current.logs).toEqual([]);
    expect(result.current.isConnected).toBe(false);
    expect(MockEventSource.instances.length).toBe(0);
    expect(mockGetDeploymentLogs).not.toHaveBeenCalled();
  });

  it('does not connect when targetId is undefined', () => {
    mockGetDeploymentLogs.mockResolvedValue([]);

    const { result } = renderHook(() => useDeploymentLogs(undefined));

    expect(result.current.logs).toEqual([]);
    expect(result.current.isConnected).toBe(false);
    expect(MockEventSource.instances.length).toBe(0);
    expect(mockGetDeploymentLogs).not.toHaveBeenCalled();
  });

  it('does not connect when targetId is empty string', () => {
    mockGetDeploymentLogs.mockResolvedValue([]);

    const { result } = renderHook(() => useDeploymentLogs(''));

    expect(result.current.logs).toEqual([]);
    expect(result.current.isConnected).toBe(false);
    expect(MockEventSource.instances.length).toBe(0);
    expect(mockGetDeploymentLogs).not.toHaveBeenCalled();
  });

  it('reconnects EventSource when targetId changes', async () => {
    mockGetDeploymentLogs.mockResolvedValue([]);

    const { rerender } = renderHook(({ targetId }) => useDeploymentLogs(targetId), {
      initialProps: { targetId: 'target-1' as string | null },
    });

    await waitFor(() => {
      expect(MockEventSource.instances.length).toBe(1);
    });

    const firstEs = MockEventSource.instances[0];
    expect(firstEs.url).toBe('/api/deployment-logs?targetId=target-1');

    rerender({ targetId: 'target-2' });

    await waitFor(() => {
      expect(MockEventSource.instances.length).toBe(2);
    });

    expect(firstEs.closed).toBe(true);
    expect(MockEventSource.instances[1].url).toBe('/api/deployment-logs?targetId=target-2');
  });

  it('closes EventSource when targetId changes to null', async () => {
    mockGetDeploymentLogs.mockResolvedValue([]);

    const { result, rerender } = renderHook(({ targetId }) => useDeploymentLogs(targetId), {
      initialProps: { targetId: 'target-1' as string | null },
    });

    await waitFor(() => {
      expect(MockEventSource.instances.length).toBe(1);
    });

    const es = MockEventSource.instances[0];

    rerender({ targetId: null });

    expect(es.closed).toBe(true);
    expect(result.current.logs).toEqual([]);
    expect(result.current.isConnected).toBe(false);
  });

  it('handles fetch error gracefully', async () => {
    mockGetDeploymentLogs.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useDeploymentLogs('target-1'));

    await waitFor(() => {
      expect(MockEventSource.instances.length).toBe(1);
    });

    // Logs should remain empty after failed fetch
    expect(result.current.logs).toEqual([]);
  });

  it('accumulates multiple SSE events in order', async () => {
    mockGetDeploymentLogs.mockResolvedValue([]);

    const { result } = renderHook(() => useDeploymentLogs('target-1'));

    await waitFor(() => {
      expect(MockEventSource.instances.length).toBe(1);
    });

    const log1 = { ...sampleLog, timestamp: 1000 };
    const log2 = { ...sampleStderrLog, timestamp: 1001 };
    const log3 = { ...sampleLog, line: 'Another line', timestamp: 1002 };

    act(() => {
      MockEventSource.instances[0]._emit('log', log1);
      MockEventSource.instances[0]._emit('log', log2);
      MockEventSource.instances[0]._emit('log', log3);
    });

    expect(result.current.logs).toEqual([log1, log2, log3]);
  });
});
