'use client';

import { useEffect, useState } from 'react';
import { compareVersions } from '@/lib/compare-versions';

export interface NpmVersionCheckResult {
  /** Latest version on npm, or null if not yet fetched / error */
  latest: string | null;
  /** Whether a newer version is available on npm */
  updateAvailable: boolean;
  /** True while the fetch is in progress */
  loading: boolean;
}

export function useNpmVersionCheck(currentVersion: string): NpmVersionCheckResult {
  const [latest, setLatest] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function check() {
      try {
        const res = await fetch('/api/npm-version');
        if (!res.ok) return;
        const data = (await res.json()) as { latest?: string | null };
        if (!cancelled && data.latest) {
          setLatest(data.latest);
        }
      } catch {
        // Silently fail — version check is non-critical
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    check();
    return () => {
      cancelled = true;
    };
  }, []);

  const updateAvailable = latest !== null && compareVersions(latest, currentVersion) > 0;

  return { latest, updateAvailable, loading };
}
