'use client';

import { useState, useCallback, useMemo } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';

export type FilterDimension = 'lifecycle' | 'status' | 'agentType' | 'repository';

export interface FilterState {
  lifecycle: Set<string>;
  status: Set<string>;
  agentType: Set<string>;
  repository: Set<string>;
}

export interface UseFilterStateResult {
  filters: FilterState;
  /** Toggle a value in a filter dimension (add if absent, remove if present). */
  toggleFilter: (dimension: FilterDimension, value: string) => void;
  /** Clear all values in a specific filter dimension. */
  clearFilter: (dimension: FilterDimension) => void;
  /** Clear all filters across all dimensions. */
  clearAllFilters: () => void;
  /** True if any filter dimension has active values. */
  hasActiveFilters: boolean;
}

const FILTER_DIMENSIONS: FilterDimension[] = ['lifecycle', 'status', 'agentType', 'repository'];

/** Parse comma-separated values from a URL search param into a Set. */
function parseParam(searchParams: URLSearchParams, key: string): Set<string> {
  const raw = searchParams.get(key);
  if (!raw) return new Set();
  return new Set(raw.split(',').filter(Boolean));
}

/** Serialize filter state into URL search params, preserving non-filter params. */
function buildUrl(pathname: string, searchParams: URLSearchParams, filters: FilterState): string {
  const params = new URLSearchParams();

  // Preserve non-filter params (e.g., view=board)
  for (const [key, value] of searchParams.entries()) {
    if (!FILTER_DIMENSIONS.includes(key as FilterDimension)) {
      params.set(key, value);
    }
  }

  // Serialize active filters
  for (const dim of FILTER_DIMENSIONS) {
    const values = filters[dim];
    if (values.size > 0) {
      params.set(dim, Array.from(values).join(','));
    }
  }

  const qs = params.toString();
  return qs ? `${pathname}?${qs}` : pathname;
}

/**
 * Manages four filter dimensions (lifecycle, status, agentType, repository)
 * as Sets of selected values, synchronized to URL search parameters.
 *
 * Uses router.replace() (not push) to avoid history pollution.
 */
export function useFilterState(): UseFilterStateResult {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const [filters, setFilters] = useState<FilterState>(() => ({
    lifecycle: parseParam(searchParams, 'lifecycle'),
    status: parseParam(searchParams, 'status'),
    agentType: parseParam(searchParams, 'agentType'),
    repository: parseParam(searchParams, 'repository'),
  }));

  const syncToUrl = useCallback(
    (nextFilters: FilterState) => {
      const url = buildUrl(pathname, searchParams, nextFilters);
      router.replace(url);
    },
    [pathname, searchParams, router]
  );

  const toggleFilter = useCallback(
    (dimension: FilterDimension, value: string) => {
      setFilters((prev) => {
        const next = { ...prev };
        const set = new Set(prev[dimension]);
        if (set.has(value)) {
          set.delete(value);
        } else {
          set.add(value);
        }
        next[dimension] = set;
        syncToUrl(next);
        return next;
      });
    },
    [syncToUrl]
  );

  const clearFilter = useCallback(
    (dimension: FilterDimension) => {
      setFilters((prev) => {
        const next = { ...prev, [dimension]: new Set<string>() };
        syncToUrl(next);
        return next;
      });
    },
    [syncToUrl]
  );

  const clearAllFilters = useCallback(() => {
    const empty: FilterState = {
      lifecycle: new Set(),
      status: new Set(),
      agentType: new Set(),
      repository: new Set(),
    };
    setFilters(empty);
    syncToUrl(empty);
  }, [syncToUrl]);

  const hasActiveFilters = useMemo(
    () => FILTER_DIMENSIONS.some((dim) => filters[dim].size > 0),
    [filters]
  );

  return {
    filters,
    toggleFilter,
    clearFilter,
    clearAllFilters,
    hasActiveFilters,
  };
}
