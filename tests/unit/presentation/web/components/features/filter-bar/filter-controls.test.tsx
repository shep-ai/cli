import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FilterControls } from '@/components/features/filter-bar/filter-controls';
import type { FilterState } from '@/hooks/use-filter-state';

const emptyFilters: FilterState = {
  lifecycle: new Set(),
  status: new Set(),
  agentType: new Set(),
  repository: new Set(),
};

describe('FilterControls', () => {
  const defaultProps = {
    filters: emptyFilters,
    onToggleFilter: vi.fn(),
    availableAgentTypes: ['claude-code', 'cursor'],
    availableRepositories: ['/home/user/repo-a', '/home/user/repo-b'],
  };

  it('renders all 4 filter groups', () => {
    render(<FilterControls {...defaultProps} />);

    expect(screen.getByTestId('filter-group-lifecycle')).toBeInTheDocument();
    expect(screen.getByTestId('filter-group-status')).toBeInTheDocument();
    expect(screen.getByTestId('filter-group-agentType')).toBeInTheDocument();
    expect(screen.getByTestId('filter-group-repository')).toBeInTheDocument();
  });

  it('lifecycle group shows 5 options', () => {
    render(<FilterControls {...defaultProps} />);

    const group = screen.getByTestId('filter-group-lifecycle');
    const buttons = within(group).getAllByRole('button');
    // 5 lifecycle columns: Backlog, Requirements, Implementation, Review, Done
    expect(buttons).toHaveLength(5);
    expect(within(group).getByText('Backlog')).toBeInTheDocument();
    expect(within(group).getByText('Requirements')).toBeInTheDocument();
    expect(within(group).getByText('Implementation')).toBeInTheDocument();
    expect(within(group).getByText('Review')).toBeInTheDocument();
    expect(within(group).getByText('Done')).toBeInTheDocument();
  });

  it('status group shows 6 options', () => {
    render(<FilterControls {...defaultProps} />);

    const group = screen.getByTestId('filter-group-status');
    const buttons = within(group).getAllByRole('button');
    expect(buttons).toHaveLength(6);
    expect(within(group).getByText('Creating')).toBeInTheDocument();
    expect(within(group).getByText('Running')).toBeInTheDocument();
    expect(within(group).getByText('Action Required')).toBeInTheDocument();
    expect(within(group).getByText('Done')).toBeInTheDocument();
    expect(within(group).getByText('Blocked')).toBeInTheDocument();
    expect(within(group).getByText('Error')).toBeInTheDocument();
  });

  it('agentType group shows options from available data', () => {
    render(<FilterControls {...defaultProps} />);

    const group = screen.getByTestId('filter-group-agentType');
    const buttons = within(group).getAllByRole('button');
    expect(buttons).toHaveLength(2);
    expect(within(group).getByText('claude-code')).toBeInTheDocument();
    expect(within(group).getByText('cursor')).toBeInTheDocument();
  });

  it('repository group shows options from available data', () => {
    render(<FilterControls {...defaultProps} />);

    const group = screen.getByTestId('filter-group-repository');
    const buttons = within(group).getAllByRole('button');
    expect(buttons).toHaveLength(2);
    // Repository paths show just the basename
    expect(within(group).getByText('repo-a')).toBeInTheDocument();
    expect(within(group).getByText('repo-b')).toBeInTheDocument();
  });

  it('clicking an option calls onToggleFilter with correct dimension and value', async () => {
    const user = userEvent.setup();
    const onToggleFilter = vi.fn();
    render(<FilterControls {...defaultProps} onToggleFilter={onToggleFilter} />);

    await user.click(screen.getByText('Running'));
    expect(onToggleFilter).toHaveBeenCalledWith('status', 'running');
  });

  it('clicking a lifecycle option calls onToggleFilter with column ID', async () => {
    const user = userEvent.setup();
    const onToggleFilter = vi.fn();
    render(<FilterControls {...defaultProps} onToggleFilter={onToggleFilter} />);

    await user.click(screen.getByText('Implementation'));
    expect(onToggleFilter).toHaveBeenCalledWith('lifecycle', 'implementation');
  });

  it('active filter shows filled/highlighted style', () => {
    const filters: FilterState = {
      ...emptyFilters,
      status: new Set(['running']),
    };

    render(<FilterControls {...defaultProps} filters={filters} />);

    const runningButton = screen.getByText('Running').closest('button')!;
    expect(runningButton.getAttribute('data-variant')).toBe('default');
  });

  it('inactive filter shows outline style', () => {
    render(<FilterControls {...defaultProps} />);

    const runningButton = screen.getByText('Running').closest('button')!;
    expect(runningButton.getAttribute('data-variant')).toBe('outline');
  });

  it('renders empty agent type group when no agent types available', () => {
    render(<FilterControls {...defaultProps} availableAgentTypes={[]} />);

    const group = screen.getByTestId('filter-group-agentType');
    const buttons = within(group).queryAllByRole('button');
    expect(buttons).toHaveLength(0);
  });

  it('renders empty repository group when no repositories available', () => {
    render(<FilterControls {...defaultProps} availableRepositories={[]} />);

    const group = screen.getByTestId('filter-group-repository');
    const buttons = within(group).queryAllByRole('button');
    expect(buttons).toHaveLength(0);
  });
});
