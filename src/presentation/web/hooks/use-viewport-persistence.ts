'use client';

import { useCallback, useEffect, useRef } from 'react';
import type { Viewport } from '@xyflow/react';

export type { Viewport } from '@xyflow/react';

export const STORAGE_KEY = 'shep-canvas-viewport';
export const DEBOUNCE_MS = 500;

export const DEFAULT_VIEWPORT: Viewport = { x: 30, y: 30, zoom: 0.85 };

export interface UseViewportPersistenceResult {
  defaultViewport: Viewport;
  /** True when a valid viewport was restored from localStorage. */
  hasSavedViewport: boolean;
  onMoveEnd: (viewport: Viewport) => void;
  resetViewport: () => Viewport;
}

function isValidViewport(value: unknown): value is Viewport {
  if (value == null || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }
  const v = value as Record<string, unknown>;
  return (
    typeof v.x === 'number' &&
    typeof v.y === 'number' &&
    typeof v.zoom === 'number' &&
    Number.isFinite(v.x) &&
    Number.isFinite(v.y) &&
    Number.isFinite(v.zoom) &&
    v.zoom > 0
  );
}

function readViewport(): { viewport: Viewport; fromStorage: boolean } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw == null) return { viewport: DEFAULT_VIEWPORT, fromStorage: false };
    const parsed: unknown = JSON.parse(raw);
    if (isValidViewport(parsed)) return { viewport: parsed, fromStorage: true };
    return { viewport: DEFAULT_VIEWPORT, fromStorage: false };
  } catch {
    return { viewport: DEFAULT_VIEWPORT, fromStorage: false };
  }
}

export function useViewportPersistence(): UseViewportPersistenceResult {
  const stored = useRef(readViewport()).current;
  const defaultViewport = stored.viewport;
  const hasSavedViewport = stored.fromStorage;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current != null) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  const onMoveEnd = useCallback((viewport: Viewport) => {
    if (timerRef.current != null) {
      clearTimeout(timerRef.current);
    }
    timerRef.current = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(viewport));
      } catch {
        // Silently ignore localStorage errors (quota exceeded, private browsing, etc.)
      }
    }, DEBOUNCE_MS);
  }, []);

  const resetViewport = useCallback((): Viewport => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Silently ignore localStorage errors
    }
    return DEFAULT_VIEWPORT;
  }, []);

  return { defaultViewport, hasSavedViewport, onMoveEnd, resetViewport };
}
