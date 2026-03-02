'use client';

import { usePathname } from 'next/navigation';

/**
 * Extracts the selected feature ID from the current URL path.
 * Returns `null` when no feature drawer route is active.
 */
export function useSelectedFeatureId(): string | null {
  const pathname = usePathname();
  const match = pathname.match(/^\/feature\/(.+)$/);
  return match?.[1] ?? null;
}
