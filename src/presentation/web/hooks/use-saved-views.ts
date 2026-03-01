'use client';

import { useState, useCallback } from 'react';
import type { FilterState } from '@/hooks/use-filter-state';

const STORAGE_KEY = 'shep:saved-views';

export interface SavedViewFilters {
  lifecycle: string[];
  status: string[];
  agentType: string[];
  repository: string[];
}

export interface SavedView {
  id: string;
  name: string;
  filters: SavedViewFilters;
  createdAt: string;
}

export interface UseSavedViewsOptions {
  /** Callback to apply a saved view's filter state. */
  applyFilters?: (filters: FilterState) => void;
}

export interface UseSavedViewsResult {
  views: SavedView[];
  saveView: (name: string, filters: FilterState) => void;
  deleteView: (id: string) => void;
  renameView: (id: string, newName: string) => void;
  applyView: (id: string) => void;
}

/** Read saved views from localStorage with graceful error handling. */
function readFromStorage(): SavedView[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

/** Write saved views to localStorage. */
function writeToStorage(views: SavedView[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(views));
}

/** Convert FilterState (Sets) to SavedViewFilters (arrays) for serialization. */
function filtersToArrays(filters: FilterState): SavedViewFilters {
  return {
    lifecycle: Array.from(filters.lifecycle),
    status: Array.from(filters.status),
    agentType: Array.from(filters.agentType),
    repository: Array.from(filters.repository),
  };
}

/** Convert SavedViewFilters (arrays) back to FilterState (Sets). */
function arraysToFilters(saved: SavedViewFilters): FilterState {
  return {
    lifecycle: new Set(saved.lifecycle),
    status: new Set(saved.status),
    agentType: new Set(saved.agentType),
    repository: new Set(saved.repository),
  };
}

/**
 * CRUD operations for saved filter combinations stored in localStorage.
 *
 * Each saved view stores name, filter state (4 arrays), and creation timestamp.
 * Data validated on read to handle schema changes gracefully.
 */
export function useSavedViews(options?: UseSavedViewsOptions): UseSavedViewsResult {
  const [views, setViews] = useState<SavedView[]>(() => readFromStorage());

  const saveView = useCallback((name: string, filters: FilterState) => {
    const newView: SavedView = {
      id: `view-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name,
      filters: filtersToArrays(filters),
      createdAt: new Date().toISOString(),
    };

    setViews((prev) => {
      const next = [...prev, newView];
      writeToStorage(next);
      return next;
    });
  }, []);

  const deleteView = useCallback((id: string) => {
    setViews((prev) => {
      const next = prev.filter((v) => v.id !== id);
      writeToStorage(next);
      return next;
    });
  }, []);

  const renameView = useCallback((id: string, newName: string) => {
    setViews((prev) => {
      const next = prev.map((v) => (v.id === id ? { ...v, name: newName } : v));
      writeToStorage(next);
      return next;
    });
  }, []);

  const applyView = useCallback(
    (id: string) => {
      const view = views.find((v) => v.id === id);
      if (!view) return;
      options?.applyFilters?.(arraysToFilters(view.filters));
    },
    [views, options]
  );

  return {
    views,
    saveView,
    deleteView,
    renameView,
    applyView,
  };
}
