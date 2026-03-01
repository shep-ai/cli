'use client';

import { useMemo } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { FilterDimension, FilterState } from '@/hooks/use-filter-state';
import type { SavedView } from '@/hooks/use-saved-views';
import { FilterControls } from './filter-controls';
import { SavedViewSelector } from './saved-view-selector';

export interface FilterBarProps {
  filters: FilterState;
  onToggleFilter: (dimension: FilterDimension, value: string) => void;
  onClearAllFilters: () => void;
  hasActiveFilters: boolean;
  availableAgentTypes: string[];
  availableRepositories: string[];
  savedViews: SavedView[];
  onApplyView: (id: string) => void;
  onSaveView: (name: string, filters: FilterState) => void;
  onDeleteView: (id: string) => void;
  onRenameView: (id: string, newName: string) => void;
}

export function FilterBar({
  filters,
  onToggleFilter,
  onClearAllFilters,
  hasActiveFilters,
  availableAgentTypes,
  availableRepositories,
  savedViews,
  onApplyView,
  onSaveView,
  onDeleteView,
  onRenameView,
}: FilterBarProps) {
  const activeFilterCount = useMemo(() => {
    return (
      filters.lifecycle.size +
      filters.status.size +
      filters.agentType.size +
      filters.repository.size
    );
  }, [filters]);

  return (
    <div className="bg-muted/30 flex items-start justify-between gap-3 rounded-lg border px-3 py-2">
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <FilterControls
          filters={filters}
          onToggleFilter={onToggleFilter}
          availableAgentTypes={availableAgentTypes}
          availableRepositories={availableRepositories}
        />

        {hasActiveFilters ? (
          <div className="flex items-center gap-2 pt-4">
            <Badge data-testid="active-filter-count" variant="secondary">
              {activeFilterCount}
            </Badge>
            <Button variant="ghost" size="xs" onClick={onClearAllFilters} aria-label="Clear all">
              <X className="h-3 w-3" />
              Clear all
            </Button>
          </div>
        ) : null}
      </div>

      <div className="pt-4">
        <SavedViewSelector
          views={savedViews}
          currentFilters={filters}
          onApplyView={onApplyView}
          onSaveView={onSaveView}
          onDeleteView={onDeleteView}
          onRenameView={onRenameView}
        />
      </div>
    </div>
  );
}
