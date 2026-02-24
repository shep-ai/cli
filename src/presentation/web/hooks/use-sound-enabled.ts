'use client';

import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'shep-sound-enabled';
const SYNC_EVENT = 'shep:sound-toggle';

export interface UseSoundEnabledResult {
  enabled: boolean;
  toggle: () => void;
}

export function useSoundEnabled(): UseSoundEnabledResult {
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'false') setEnabled(false);

    // Sync across all useSoundEnabled instances in the same tab
    const onSync = (e: Event) => {
      setEnabled((e as CustomEvent<boolean>).detail);
    };
    window.addEventListener(SYNC_EVENT, onSync);
    return () => window.removeEventListener(SYNC_EVENT, onSync);
  }, []);

  const toggle = useCallback(() => {
    setEnabled((prev) => {
      const next = !prev;
      localStorage.setItem(STORAGE_KEY, String(next));
      window.dispatchEvent(new CustomEvent(SYNC_EVENT, { detail: next }));
      return next;
    });
  }, []);

  return { enabled, toggle };
}
