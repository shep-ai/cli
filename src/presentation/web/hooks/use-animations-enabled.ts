'use client';

import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'shep-animations-enabled';
const SYNC_EVENT = 'shep:animations-toggle';
const BODY_CLASS = 'no-animations';

export interface UseAnimationsEnabledResult {
  enabled: boolean;
  toggle: () => void;
}

export function useAnimationsEnabled(): UseAnimationsEnabledResult {
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'false') {
      setEnabled(false);
      document.body.classList.add(BODY_CLASS);
    }

    const onSync = (e: Event) => {
      const next = (e as CustomEvent<boolean>).detail;
      setEnabled(next);
      document.body.classList.toggle(BODY_CLASS, !next);
    };
    window.addEventListener(SYNC_EVENT, onSync);
    return () => window.removeEventListener(SYNC_EVENT, onSync);
  }, []);

  const toggle = useCallback(() => {
    const next = !enabled;
    localStorage.setItem(STORAGE_KEY, String(next));
    setEnabled(next);
    document.body.classList.toggle(BODY_CLASS, !next);
    window.dispatchEvent(new CustomEvent(SYNC_EVENT, { detail: next }));
  }, [enabled]);

  return { enabled, toggle };
}
