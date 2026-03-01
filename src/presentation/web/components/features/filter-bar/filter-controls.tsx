'use client';

import type { FilterDimension, FilterState } from '@/hooks/use-filter-state';
import { Button } from '@/components/ui/button';
import { BOARD_COLUMNS } from '@/lib/build-board-data';
import type { FeatureNodeState } from '@/components/common/feature-node';

/** Status filter options with display labels. */
const STATUS_OPTIONS: { value: FeatureNodeState; label: string }[] = [
  { value: 'creating', label: 'Creating' },
  { value: 'running', label: 'Running' },
  { value: 'action-required', label: 'Action Required' },
  { value: 'done', label: 'Done' },
  { value: 'blocked', label: 'Blocked' },
  { value: 'error', label: 'Error' },
];

export interface FilterControlsProps {
  filters: FilterState;
  onToggleFilter: (dimension: FilterDimension, value: string) => void;
  availableAgentTypes: string[];
  availableRepositories: string[];
}

/** Extract the basename from a repository path for display. */
function repoBasename(repoPath: string): string {
  const parts = repoPath.split('/');
  return parts[parts.length - 1] || repoPath;
}

interface FilterGroupProps {
  label: string;
  dimension: FilterDimension;
  options: { value: string; label: string }[];
  activeValues: Set<string>;
  onToggle: (dimension: FilterDimension, value: string) => void;
  testId: string;
}

function FilterGroup({
  label,
  dimension,
  options,
  activeValues,
  onToggle,
  testId,
}: FilterGroupProps) {
  return (
    <div data-testid={testId} className="flex flex-col gap-1">
      <span className="text-muted-foreground text-xs font-medium">{label}</span>
      <div className="flex flex-wrap gap-1">
        {options.map((opt) => {
          const isActive = activeValues.has(opt.value);
          return (
            <Button
              key={opt.value}
              variant={isActive ? 'default' : 'outline'}
              size="xs"
              onClick={() => onToggle(dimension, opt.value)}
            >
              {opt.label}
            </Button>
          );
        })}
      </div>
    </div>
  );
}

export function FilterControls({
  filters,
  onToggleFilter,
  availableAgentTypes,
  availableRepositories,
}: FilterControlsProps) {
  const lifecycleOptions = BOARD_COLUMNS.map((col) => ({
    value: col.id,
    label: col.label,
  }));

  const statusOptions = STATUS_OPTIONS.map((s) => ({
    value: s.value,
    label: s.label,
  }));

  const agentTypeOptions = availableAgentTypes.map((at) => ({
    value: at,
    label: at,
  }));

  const repositoryOptions = availableRepositories.map((repo) => ({
    value: repo,
    label: repoBasename(repo),
  }));

  return (
    <div className="flex flex-wrap items-start gap-4">
      <FilterGroup
        label="Lifecycle"
        dimension="lifecycle"
        options={lifecycleOptions}
        activeValues={filters.lifecycle}
        onToggle={onToggleFilter}
        testId="filter-group-lifecycle"
      />
      <FilterGroup
        label="Status"
        dimension="status"
        options={statusOptions}
        activeValues={filters.status}
        onToggle={onToggleFilter}
        testId="filter-group-status"
      />
      <FilterGroup
        label="Agent"
        dimension="agentType"
        options={agentTypeOptions}
        activeValues={filters.agentType}
        onToggle={onToggleFilter}
        testId="filter-group-agentType"
      />
      <FilterGroup
        label="Repository"
        dimension="repository"
        options={repositoryOptions}
        activeValues={filters.repository}
        onToggle={onToggleFilter}
        testId="filter-group-repository"
      />
    </div>
  );
}
