import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { ElapsedTime } from '@/components/common/elapsed-time';

describe('ElapsedTime', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders 00:00 when startedAt is now', () => {
    const now = Date.now();
    vi.setSystemTime(now);

    render(<ElapsedTime startedAt={now} />);

    expect(screen.getByText('00:00')).toBeInTheDocument();
  });

  it('ticks to 00:01 after 1 second', () => {
    const now = Date.now();
    vi.setSystemTime(now);

    render(<ElapsedTime startedAt={now} />);

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(screen.getByText('00:01')).toBeInTheDocument();
  });

  it('formats as mm:ss for durations under 1 hour', () => {
    const now = Date.now();
    const startedAt = now - 330 * 1000; // 330 seconds = 5:30
    vi.setSystemTime(now);

    render(<ElapsedTime startedAt={startedAt} />);

    expect(screen.getByText('05:30')).toBeInTheDocument();
  });

  it('switches to Xh format for durations >= 1 hour', () => {
    const now = Date.now();
    const startedAt = now - 3600 * 1000; // exactly 1 hour
    vi.setSystemTime(now);

    render(<ElapsedTime startedAt={startedAt} />);

    expect(screen.getByText('1h')).toBeInTheDocument();
  });

  it('cleans up interval on unmount', () => {
    const clearIntervalSpy = vi.spyOn(globalThis, 'clearInterval');
    const now = Date.now();
    vi.setSystemTime(now);

    const { unmount } = render(<ElapsedTime startedAt={now} />);

    unmount();

    expect(clearIntervalSpy).toHaveBeenCalled();
    clearIntervalSpy.mockRestore();
  });
});
