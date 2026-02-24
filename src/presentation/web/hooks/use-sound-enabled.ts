'use client';

import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'shep-sound-enabled';

export interface UseSoundEnabledResult {
  enabled: boolean;
  toggle: () => void;
}

export function useSoundEnabled(): UseSoundEnabledResult {
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'false') setEnabled(false);
  }, []);

  const toggle = useCallback(() => {
    setEnabled((prev) => {
      const next = !prev;
      localStorage.setItem(STORAGE_KEY, String(next));
      return next;
    });
  }, []);

  return { enabled, toggle };
}
