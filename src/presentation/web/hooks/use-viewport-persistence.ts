'use client';

import { useCallback, useRef } from 'react';

export interface Viewport {
  x: number;
  y: number;
  zoom: number;
}

export const DEFAULT_VIEWPORT: Viewport = { x: 0, y: 0, zoom: 1 };

/**
 * Persists the ReactFlow viewport position across re-renders so the canvas
 * doesn't jump back to the origin when nodes update.
 */
export function useViewportPersistence() {
  const viewportRef = useRef<Viewport>(DEFAULT_VIEWPORT);

  const onMoveEnd = useCallback((viewport: Viewport) => {
    viewportRef.current = viewport;
  }, []);

  return {
    defaultViewport: viewportRef.current,
    onMoveEnd,
  };
}
