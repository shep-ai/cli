'use client';

import { useEffect, useState } from 'react';

export interface VersionData {
  version: string;
  packageName: string;
  description: string;
  branch: string;
  commitHash: string;
  instancePath: string;
  isDev: boolean;
}

const DEFAULT_VERSION_DATA: VersionData = {
  version: 'unknown',
  packageName: '@shepai/cli',
  description: 'Autonomous AI Native SDLC Platform',
  branch: '',
  commitHash: '',
  instancePath: '',
  isDev: false,
};

/**
 * Fetches runtime version info from the server API.
 *
 * NEXT_PUBLIC_* env vars are inlined at build time for client components,
 * so they can show a stale version after a CLI upgrade. This hook fetches
 * the version from a server-side API route that reads the env vars at runtime.
 */
export function useVersion(): VersionData {
  const [data, setData] = useState<VersionData>(DEFAULT_VERSION_DATA);

  useEffect(() => {
    let cancelled = false;

    async function fetchVersion() {
      try {
        const res = await fetch('/api/version');
        if (!res.ok) return;
        const json = (await res.json()) as VersionData;
        if (!cancelled) {
          setData(json);
        }
      } catch {
        // Version fetch is non-critical — keep defaults
      }
    }

    fetchVersion();
    return () => {
      cancelled = true;
    };
  }, []);

  return data;
}
