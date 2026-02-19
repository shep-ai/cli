import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { NotificationSeverity, NotificationEventType } from '@/domain/generated/output.js';
import type { NotificationEvent } from '@/domain/generated/output.js';

// --- Mock EventSource ---

type EventSourceListener = (event: MessageEvent) => void;

class MockEventSource {
  static instances: MockEventSource[] = [];

  url: string;
  readyState = 0; // CONNECTING
  onopen: (() => void) | null = null;
  onerror: (() => void) | null = null;
  listeners = new Map<string, EventSourceListener[]>();

  static readonly CONNECTING = 0;
  static readonly OPEN = 1;
  static readonly CLOSED = 2;

  constructor(url: string) {
    this.url = url;
    MockEventSource.instances.push(this);
  }

  addEventListener(event: string, handler: EventSourceListener) {
    const handlers = this.listeners.get(event) ?? [];
    handlers.push(handler);
    this.listeners.set(event, handlers);
  }

  removeEventListener(event: string, handler: EventSourceListener) {
    const handlers = this.listeners.get(event) ?? [];
    this.listeners.set(
      event,
      handlers.filter((h) => h !== handler)
    );
  }

  close = vi.fn();

  // Test helpers
  simulateOpen() {
    this.readyState = MockEventSource.OPEN;
    this.onopen?.();
  }

  simulateError() {
    this.readyState = MockEventSource.CLOSED;
    this.onerror?.();
  }

  simulateEvent(eventName: string, data: string) {
    const handlers = this.listeners.get(eventName) ?? [];
    const messageEvent = { data } as MessageEvent;
    handlers.forEach((h) => h(messageEvent));
  }
}

// Replace global EventSource
const originalEventSource = globalThis.EventSource;

function createSampleEvent(overrides?: Partial<NotificationEvent>): NotificationEvent {
  return {
    eventType: NotificationEventType.AgentCompleted,
    agentRunId: 'run-123',
    featureName: 'Test Feature',
    message: 'Agent completed successfully',
    severity: NotificationSeverity.Success,
    timestamp: '2026-02-17T10:00:00Z',
    ...overrides,
  };
}

describe('useAgentEvents', () => {
  // eslint-disable-next-line @typescript-eslint/consistent-type-imports
  let useAgentEvents: typeof import('../../../../../src/presentation/web/hooks/use-agent-events.js').useAgentEvents;

  beforeEach(async () => {
    vi.useFakeTimers();
    MockEventSource.instances = [];
    (globalThis as any).EventSource = MockEventSource;

    // Fresh import to avoid stale module state
    const mod = await import('../../../../../src/presentation/web/hooks/use-agent-events.js');
    useAgentEvents = mod.useAgentEvents;
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    (globalThis as any).EventSource = originalEventSource;
  });

  it('creates EventSource connection to /api/agent-events', () => {
    renderHook(() => useAgentEvents());

    expect(MockEventSource.instances).toHaveLength(1);
    expect(MockEventSource.instances[0].url).toBe('/api/agent-events');
  });

  it('connectionStatus starts as connecting', () => {
    const { result } = renderHook(() => useAgentEvents());

    expect(result.current.connectionStatus).toBe('connecting');
  });

  it('connectionStatus transitions to connected on open', () => {
    const { result } = renderHook(() => useAgentEvents());

    act(() => {
      MockEventSource.instances[0].simulateOpen();
    });

    expect(result.current.connectionStatus).toBe('connected');
  });

  it('received SSE event is parsed into typed NotificationEvent', () => {
    const { result } = renderHook(() => useAgentEvents());
    const event = createSampleEvent();

    act(() => {
      MockEventSource.instances[0].simulateOpen();
      MockEventSource.instances[0].simulateEvent('notification', JSON.stringify(event));
    });

    expect(result.current.events).toHaveLength(1);
    expect(result.current.events[0]).toEqual(event);
    expect(result.current.lastEvent).toEqual(event);
  });

  it('accumulates multiple events', () => {
    const { result } = renderHook(() => useAgentEvents());

    const event1 = createSampleEvent({
      eventType: NotificationEventType.AgentStarted,
    });
    const event2 = createSampleEvent({
      eventType: NotificationEventType.AgentCompleted,
    });

    act(() => {
      MockEventSource.instances[0].simulateOpen();
      MockEventSource.instances[0].simulateEvent('notification', JSON.stringify(event1));
      MockEventSource.instances[0].simulateEvent('notification', JSON.stringify(event2));
    });

    expect(result.current.events).toHaveLength(2);
    expect(result.current.lastEvent).toEqual(event2);
  });

  it('EventSource is closed on unmount', () => {
    const { unmount } = renderHook(() => useAgentEvents());
    const es = MockEventSource.instances[0];

    unmount();

    expect(es.close).toHaveBeenCalled();
  });

  it('reconnection attempted with increasing delay after error', async () => {
    renderHook(() => useAgentEvents());

    // First connection errors
    act(() => {
      MockEventSource.instances[0].simulateError();
    });

    expect(MockEventSource.instances).toHaveLength(1);

    // After 1s backoff, new connection
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(MockEventSource.instances).toHaveLength(2);

    // Second connection errors
    act(() => {
      MockEventSource.instances[1].simulateError();
    });

    // After 2s backoff, new connection
    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(MockEventSource.instances).toHaveLength(3);

    // Third connection errors
    act(() => {
      MockEventSource.instances[2].simulateError();
    });

    // After 4s backoff, new connection
    act(() => {
      vi.advanceTimersByTime(4000);
    });

    expect(MockEventSource.instances).toHaveLength(4);
  });

  it('backoff resets on successful connection', () => {
    renderHook(() => useAgentEvents());

    // First error + reconnect
    act(() => {
      MockEventSource.instances[0].simulateError();
    });
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(MockEventSource.instances).toHaveLength(2);

    // Second connection opens successfully
    act(() => {
      MockEventSource.instances[1].simulateOpen();
    });

    // Wait for connection to be considered stable (5s)
    act(() => {
      vi.advanceTimersByTime(5000);
    });

    // Then errors again
    act(() => {
      MockEventSource.instances[1].simulateError();
    });

    // Should reconnect after 1s again (backoff was reset after stable connection)
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(MockEventSource.instances).toHaveLength(3);
  });

  it('backoff does NOT reset if connection closes quickly', () => {
    renderHook(() => useAgentEvents());

    // First error → backoff becomes 2s
    act(() => {
      MockEventSource.instances[0].simulateError();
    });
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(MockEventSource.instances).toHaveLength(2);

    // Second connection opens but errors before stable threshold
    act(() => {
      MockEventSource.instances[1].simulateOpen();
    });
    act(() => {
      MockEventSource.instances[1].simulateError();
    });

    // Backoff was NOT reset — should need 2s (not 1s) to reconnect
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(MockEventSource.instances).toHaveLength(2); // no new connection yet

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(MockEventSource.instances).toHaveLength(3); // now reconnected after 2s
  });

  it('runId parameter adds query string to EventSource URL', () => {
    renderHook(() => useAgentEvents({ runId: 'abc-456' }));

    expect(MockEventSource.instances[0].url).toBe('/api/agent-events?runId=abc-456');
  });

  it('connectionStatus is disconnected after error before reconnect', () => {
    const { result } = renderHook(() => useAgentEvents());

    act(() => {
      MockEventSource.instances[0].simulateError();
    });

    expect(result.current.connectionStatus).toBe('disconnected');
  });

  it('handles missing EventSource gracefully', () => {
    const original = (globalThis as any).EventSource;
    delete (globalThis as any).EventSource;

    try {
      const { result } = renderHook(() => useAgentEvents());
      // No EventSource instances created
      expect(MockEventSource.instances).toHaveLength(0);
      expect(result.current.connectionStatus).toBe('disconnected');
    } finally {
      (globalThis as any).EventSource = original;
    }
  });
});
