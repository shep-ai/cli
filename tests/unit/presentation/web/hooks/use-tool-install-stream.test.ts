import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useToolInstallStream } from '../../../../../src/presentation/web/hooks/use-tool-install-stream';

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

  it('transitions to error state on onerror', () => {
    const { result } = renderHook(() => useToolInstallStream('tmux'));

    act(() => {
      result.current.startInstall();
    });

    const es = MockEventSource.instances[0];
    act(() => {
      es.onerror?.(new Event('error'));
    });

    expect(result.current.status).toBe('error');
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
