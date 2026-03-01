'use client';

import { useMemo } from 'react';
import type { FeatureNodeData } from '@/components/common/feature-node';
import { BOARD_COLUMNS, type BoardColumnId } from '@/lib/build-board-data';
import type { FilterState } from '@/hooks/use-filter-state';

/** Map FeatureNodeData lifecycle phases back to board column IDs for filtering. */
const lifecyclePhaseToColumnId: Record<string, BoardColumnId> = {
  requirements: 'requirements',
  research: 'requirements',
  implementation: 'implementation',
  review: 'review',
  deploy: 'done',
  maintain: 'done',
};

/** Map filter lifecycle values (board column IDs) to matching feature lifecycle phases. */
function matchesLifecycleFilter(feature: FeatureNodeData, lifecycleFilter: Set<string>): boolean {
  if (lifecycleFilter.size === 0) return true;
  const columnId = lifecyclePhaseToColumnId[feature.lifecycle] ?? 'backlog';
  return lifecycleFilter.has(columnId);
}

function matchesFilters(feature: FeatureNodeData, filters: FilterState): boolean {
  // Status filter
  if (filters.status.size > 0 && !filters.status.has(feature.state)) {
    return false;
  }

  // Lifecycle filter (matches board column ID)
  if (!matchesLifecycleFilter(feature, filters.lifecycle)) {
    return false;
  }

  // Agent type filter
  if (filters.agentType.size > 0) {
    if (!feature.agentType || !filters.agentType.has(feature.agentType)) {
      return false;
    }
  }

  // Repository filter
  if (filters.repository.size > 0 && !filters.repository.has(feature.repositoryPath)) {
    return false;
  }

  return true;
}

/** Group pre-derived FeatureNodeData into board columns. */
function groupIntoColumns(features: FeatureNodeData[]): Map<BoardColumnId, FeatureNodeData[]> {
  const result = new Map<BoardColumnId, FeatureNodeData[]>();
  for (const col of BOARD_COLUMNS) {
    result.set(col.id, []);
  }

  for (const feature of features) {
    // Map from FeatureNodeData lifecycle phase to board column
    const columnId = lifecyclePhaseToColumnId[feature.lifecycle] ?? 'backlog';
    result.get(columnId)!.push(feature);
  }

  return result;
}

export interface UseBoardStateOptions {
  features: FeatureNodeData[];
  filters: FilterState;
}

export interface UseBoardStateResult {
  columns: Map<BoardColumnId, FeatureNodeData[]>;
  totalCount: number;
}

/**
 * Derives board column data from feature list and active filters.
 * Filters features, groups them into 5 columns, and memoizes the result.
 */
export function useBoardState({ features, filters }: UseBoardStateOptions): UseBoardStateResult {
  return useMemo(() => {
    const filtered = features.filter((f) => matchesFilters(f, filters));
    const columns = groupIntoColumns(filtered);
    return { columns, totalCount: filtered.length };
  }, [features, filters]);
}
