'use server';

import { getGraphData } from '@/app/(dashboard)/get-graph-data';

/**
 * Server action that fetches fresh graph nodes and edges.
 * Used as a lightweight polling fallback for active features,
 * avoiding full router.refresh() page re-renders.
 */
export async function fetchGraphData() {
  return getGraphData();
}
