import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

import {
  useViewportPersistence,
  DEFAULT_VIEWPORT,
  STORAGE_KEY,
} from '../../../../../src/presentation/web/hooks/use-viewport-persistence.js';

describe('useViewportPersistence', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('mount-time viewport restoration (task-1)', () => {
    it('returns default viewport when localStorage is empty', () => {
      vi.mocked(localStorage.getItem).mockReturnValue(null);

      const { result } = renderHook(() => useViewportPersistence());

      expect(result.current.defaultViewport).toEqual(DEFAULT_VIEWPORT);
      expect(result.current.hasSavedViewport).toBe(false);
      expect(localStorage.getItem).toHaveBeenCalledWith(STORAGE_KEY);
    });

    it('returns saved viewport when valid JSON exists in localStorage', () => {
      const saved = { x: 100, y: 200, zoom: 1.5 };
      vi.mocked(localStorage.getItem).mockReturnValue(JSON.stringify(saved));

      const { result } = renderHook(() => useViewportPersistence());

      expect(result.current.defaultViewport).toEqual(saved);
      expect(result.current.hasSavedViewport).toBe(true);
    });

    it('returns default when localStorage has malformed JSON', () => {
      vi.mocked(localStorage.getItem).mockReturnValue('not-valid-json{{{');

      const { result } = renderHook(() => useViewportPersistence());

      expect(result.current.defaultViewport).toEqual(DEFAULT_VIEWPORT);
    });

    it('returns default when viewport has non-numeric x value', () => {
      vi.mocked(localStorage.getItem).mockReturnValue(
        JSON.stringify({ x: 'foo', y: 30, zoom: 0.85 })
      );

      const { result } = renderHook(() => useViewportPersistence());

      expect(result.current.defaultViewport).toEqual(DEFAULT_VIEWPORT);
    });

    it('returns default when viewport has non-numeric y value', () => {
      vi.mocked(localStorage.getItem).mockReturnValue(
        JSON.stringify({ x: 30, y: null, zoom: 0.85 })
      );

      const { result } = renderHook(() => useViewportPersistence());

      expect(result.current.defaultViewport).toEqual(DEFAULT_VIEWPORT);
    });

    it('returns default when viewport has non-numeric zoom value', () => {
      vi.mocked(localStorage.getItem).mockReturnValue(
        JSON.stringify({ x: 30, y: 30, zoom: 'big' })
      );

      const { result } = renderHook(() => useViewportPersistence());

      expect(result.current.defaultViewport).toEqual(DEFAULT_VIEWPORT);
    });

    it('returns default when zoom is zero', () => {
      vi.mocked(localStorage.getItem).mockReturnValue(JSON.stringify({ x: 30, y: 30, zoom: 0 }));

      const { result } = renderHook(() => useViewportPersistence());

      expect(result.current.defaultViewport).toEqual(DEFAULT_VIEWPORT);
    });

    it('returns default when zoom is negative', () => {
      vi.mocked(localStorage.getItem).mockReturnValue(JSON.stringify({ x: 30, y: 30, zoom: -1 }));

      const { result } = renderHook(() => useViewportPersistence());

      expect(result.current.defaultViewport).toEqual(DEFAULT_VIEWPORT);
    });

    it('returns default when x is NaN', () => {
      vi.mocked(localStorage.getItem).mockReturnValue(
        JSON.stringify({ x: NaN, y: 30, zoom: 0.85 })
      );

      const { result } = renderHook(() => useViewportPersistence());

      expect(result.current.defaultViewport).toEqual(DEFAULT_VIEWPORT);
    });

    it('returns default when y is Infinity', () => {
      vi.mocked(localStorage.getItem).mockReturnValue(
        JSON.stringify({ x: 30, y: Infinity, zoom: 0.85 })
      );

      const { result } = renderHook(() => useViewportPersistence());

      expect(result.current.defaultViewport).toEqual(DEFAULT_VIEWPORT);
    });

    it('returns default when zoom is -Infinity', () => {
      vi.mocked(localStorage.getItem).mockReturnValue(
        JSON.stringify({ x: 30, y: 30, zoom: -Infinity })
      );

      const { result } = renderHook(() => useViewportPersistence());

      expect(result.current.defaultViewport).toEqual(DEFAULT_VIEWPORT);
    });

    it('returns default when localStorage.getItem throws', () => {
      vi.mocked(localStorage.getItem).mockImplementation(() => {
        throw new Error('SecurityError: localStorage disabled');
      });

      const { result } = renderHook(() => useViewportPersistence());

      expect(result.current.defaultViewport).toEqual(DEFAULT_VIEWPORT);
    });

    it('returns default when stored value is an array', () => {
      vi.mocked(localStorage.getItem).mockReturnValue(JSON.stringify([1, 2, 3]));

      const { result } = renderHook(() => useViewportPersistence());

      expect(result.current.defaultViewport).toEqual(DEFAULT_VIEWPORT);
    });

    it('returns default when stored value is a number', () => {
      vi.mocked(localStorage.getItem).mockReturnValue('42');

      const { result } = renderHook(() => useViewportPersistence());

      expect(result.current.defaultViewport).toEqual(DEFAULT_VIEWPORT);
    });

    it('returns default when stored object is missing zoom key', () => {
      vi.mocked(localStorage.getItem).mockReturnValue(JSON.stringify({ x: 30, y: 30 }));

      const { result } = renderHook(() => useViewportPersistence());

      expect(result.current.defaultViewport).toEqual(DEFAULT_VIEWPORT);
    });
  });

  describe('debounced save via onMoveEnd (task-2)', () => {
    it('does not write to localStorage before 500ms', () => {
      vi.mocked(localStorage.getItem).mockReturnValue(null);

      const { result } = renderHook(() => useViewportPersistence());

      act(() => {
        result.current.onMoveEnd({ x: 50, y: 60, zoom: 1.2 });
      });

      vi.advanceTimersByTime(499);

      expect(localStorage.setItem).not.toHaveBeenCalled();
    });

    it('writes to localStorage after 500ms', () => {
      vi.mocked(localStorage.getItem).mockReturnValue(null);

      const { result } = renderHook(() => useViewportPersistence());

      act(() => {
        result.current.onMoveEnd({ x: 50, y: 60, zoom: 1.2 });
      });

      vi.advanceTimersByTime(500);

      expect(localStorage.setItem).toHaveBeenCalledWith(
        STORAGE_KEY,
        JSON.stringify({ x: 50, y: 60, zoom: 1.2 })
      );
    });

    it('rapid successive onMoveEnd calls only save the last viewport', () => {
      vi.mocked(localStorage.getItem).mockReturnValue(null);

      const { result } = renderHook(() => useViewportPersistence());

      act(() => {
        result.current.onMoveEnd({ x: 10, y: 20, zoom: 0.5 });
      });

      vi.advanceTimersByTime(200);

      act(() => {
        result.current.onMoveEnd({ x: 30, y: 40, zoom: 0.8 });
      });

      vi.advanceTimersByTime(200);

      act(() => {
        result.current.onMoveEnd({ x: 50, y: 60, zoom: 1.2 });
      });

      vi.advanceTimersByTime(500);

      expect(localStorage.setItem).toHaveBeenCalledTimes(1);
      expect(localStorage.setItem).toHaveBeenCalledWith(
        STORAGE_KEY,
        JSON.stringify({ x: 50, y: 60, zoom: 1.2 })
      );
    });

    it('localStorage.setItem exceptions are silently caught', () => {
      vi.mocked(localStorage.getItem).mockReturnValue(null);
      vi.mocked(localStorage.setItem).mockImplementation(() => {
        throw new Error('QuotaExceededError');
      });

      const { result } = renderHook(() => useViewportPersistence());

      act(() => {
        result.current.onMoveEnd({ x: 50, y: 60, zoom: 1.2 });
      });

      // Should not throw
      expect(() => vi.advanceTimersByTime(500)).not.toThrow();
    });

    it('timer is cleaned up on unmount (no writes after unmount)', () => {
      vi.mocked(localStorage.getItem).mockReturnValue(null);

      const { result, unmount } = renderHook(() => useViewportPersistence());

      act(() => {
        result.current.onMoveEnd({ x: 50, y: 60, zoom: 1.2 });
      });

      unmount();

      vi.advanceTimersByTime(500);

      expect(localStorage.setItem).not.toHaveBeenCalled();
    });

    it('onMoveEnd has stable identity across re-renders', () => {
      vi.mocked(localStorage.getItem).mockReturnValue(null);

      const { result, rerender } = renderHook(() => useViewportPersistence());

      const firstOnMoveEnd = result.current.onMoveEnd;

      rerender();

      expect(result.current.onMoveEnd).toBe(firstOnMoveEnd);
    });
  });
});
