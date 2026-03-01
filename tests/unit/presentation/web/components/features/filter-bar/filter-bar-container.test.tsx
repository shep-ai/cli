import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FilterBar } from '@/components/features/filter-bar/filter-bar';
import type { FilterState } from '@/hooks/use-filter-state';
import type { SavedView } from '@/hooks/use-saved-views';

const emptyFilters: FilterState = {
  lifecycle: new Set(),
  status: new Set(),
  agentType: new Set(),
  repository: new Set(),
};

const activeFilters: FilterState = {
  lifecycle: new Set(['implementation']),
  status: new Set(['running', 'blocked']),
  agentType: new Set(['claude-code']),
  repository: new Set(),
};

describe('FilterBar', () => {
  const defaultProps = {
    filters: emptyFilters,
    onToggleFilter: vi.fn(),
    onClearAllFilters: vi.fn(),
    hasActiveFilters: false,
    availableAgentTypes: ['claude-code', 'cursor'],
    availableRepositories: ['/home/user/repo'],
    savedViews: [] as SavedView[],
    onApplyView: vi.fn(),
    onSaveView: vi.fn(),
    onDeleteView: vi.fn(),
    onRenameView: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders FilterControls and SavedViewSelector', () => {
    render(<FilterBar {...defaultProps} />);

    // FilterControls renders filter groups
    expect(screen.getByTestId('filter-group-lifecycle')).toBeInTheDocument();
    expect(screen.getByTestId('filter-group-status')).toBeInTheDocument();

    // SavedViewSelector renders its trigger
    expect(screen.getByRole('button', { name: /saved views/i })).toBeInTheDocument();
  });

  it('clear all button appears only when filters are active', () => {
    const { rerender } = render(<FilterBar {...defaultProps} hasActiveFilters={false} />);
    expect(screen.queryByRole('button', { name: /clear all/i })).not.toBeInTheDocument();

    rerender(<FilterBar {...defaultProps} hasActiveFilters={true} filters={activeFilters} />);
    expect(screen.getByRole('button', { name: /clear all/i })).toBeInTheDocument();
  });

  it('clear all calls onClearAllFilters', async () => {
    const user = userEvent.setup();
    const onClearAllFilters = vi.fn();
    render(
      <FilterBar
        {...defaultProps}
        hasActiveFilters={true}
        filters={activeFilters}
        onClearAllFilters={onClearAllFilters}
      />
    );

    await user.click(screen.getByRole('button', { name: /clear all/i }));
    expect(onClearAllFilters).toHaveBeenCalledTimes(1);
  });

  it('shows active filter count when filters are active', () => {
    render(<FilterBar {...defaultProps} hasActiveFilters={true} filters={activeFilters} />);

    // 1 lifecycle + 2 status + 1 agentType = 4 active filters
    expect(screen.getByText('4')).toBeInTheDocument();
  });

  it('does not show filter count when no filters are active', () => {
    render(<FilterBar {...defaultProps} />);
    // No count badge should appear
    expect(screen.queryByTestId('active-filter-count')).not.toBeInTheDocument();
  });
});
