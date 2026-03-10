import { describe, it, expect } from 'vitest';
import { formatDuration } from '@/lib/format-duration';

describe('formatDuration', () => {
  it('returns "0s" for 0 milliseconds', () => {
    expect(formatDuration(0)).toBe('0s');
  });

  it('formats sub-second values as "<1s"', () => {
    expect(formatDuration(500)).toBe('<1s');
    expect(formatDuration(999)).toBe('<1s');
  });

  it('formats seconds only (under 60s)', () => {
    expect(formatDuration(1000)).toBe('1s');
    expect(formatDuration(5000)).toBe('5s');
    expect(formatDuration(30000)).toBe('30s');
    expect(formatDuration(59000)).toBe('59s');
  });

  it('formats minutes and seconds', () => {
    expect(formatDuration(60000)).toBe('1m 0s');
    expect(formatDuration(90000)).toBe('1m 30s');
    expect(formatDuration(125000)).toBe('2m 5s');
  });

  it('formats minutes only when seconds are 0', () => {
    expect(formatDuration(120000)).toBe('2m 0s');
    expect(formatDuration(300000)).toBe('5m 0s');
  });

  it('formats hours and minutes', () => {
    expect(formatDuration(3600000)).toBe('1h 0m');
    expect(formatDuration(3660000)).toBe('1h 1m');
    expect(formatDuration(5400000)).toBe('1h 30m');
    expect(formatDuration(7200000)).toBe('2h 0m');
    expect(formatDuration(7380000)).toBe('2h 3m');
  });

  it('drops seconds when showing hours', () => {
    // 1h 30m 45s should show as "1h 30m" (seconds omitted for readability)
    expect(formatDuration(5445000)).toBe('1h 30m');
  });

  it('handles large durations', () => {
    // 2h 30m
    expect(formatDuration(9000000)).toBe('2h 30m');
  });

  it('rounds down partial seconds', () => {
    expect(formatDuration(5500)).toBe('5s');
    expect(formatDuration(61500)).toBe('1m 1s');
  });
});
