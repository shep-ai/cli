'use client';

import { useState, useEffect } from 'react';

/**
 * Defers mount/unmount of content to allow opacity transitions.
 * When expanding: mounts immediately, then sets visible on next frame.
 * When collapsing: hides immediately, then unmounts after `ms` delay.
 */
export function useDeferredMount(isCollapsed: boolean, ms: number) {
  const [mounted, setMounted] = useState(!isCollapsed);
  const [visible, setVisible] = useState(!isCollapsed);

  useEffect(() => {
    if (!isCollapsed) {
      setMounted(true);
      // delay visibility by one frame so the element mounts at opacity-0 first
      const raf = requestAnimationFrame(() => setVisible(true));
      return () => cancelAnimationFrame(raf);
    }
    setVisible(false);
    const t = window.setTimeout(() => setMounted(false), ms);
    return () => window.clearTimeout(t);
  }, [isCollapsed, ms]);

  return { mounted, visible };
}
