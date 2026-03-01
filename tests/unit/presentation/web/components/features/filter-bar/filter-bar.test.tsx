import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SavedViewSelector } from '@/components/features/filter-bar/saved-view-selector';
import type { SavedView } from '@/hooks/use-saved-views';
import type { FilterState } from '@/hooks/use-filter-state';

const emptyFilters: FilterState = {
  lifecycle: new Set(),
  status: new Set(),
  agentType: new Set(),
  repository: new Set(),
};

const activeFilters: FilterState = {
  lifecycle: new Set(['implementation']),
  status: new Set(['running']),
  agentType: new Set(),
  repository: new Set(),
};

const sampleViews: SavedView[] = [
  {
    id: 'v1',
    name: 'Active Features',
    filters: {
      lifecycle: ['implementation'],
      status: ['running'],
      agentType: [],
      repository: [],
    },
    createdAt: '2026-02-01T00:00:00.000Z',
  },
  {
    id: 'v2',
    name: 'Review Queue',
    filters: {
      lifecycle: ['review'],
      status: ['action-required'],
      agentType: [],
      repository: [],
    },
    createdAt: '2026-02-15T00:00:00.000Z',
  },
];

describe('SavedViewSelector', () => {
  const defaultProps = {
    views: [] as SavedView[],
    currentFilters: emptyFilters,
    onApplyView: vi.fn(),
    onSaveView: vi.fn(),
    onDeleteView: vi.fn(),
    onRenameView: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the dropdown trigger button', () => {
    render(<SavedViewSelector {...defaultProps} />);
    expect(screen.getByRole('button', { name: /saved views/i })).toBeInTheDocument();
  });

  it('shows empty state message when no saved views', async () => {
    const user = userEvent.setup();
    render(<SavedViewSelector {...defaultProps} />);

    await user.click(screen.getByRole('button', { name: /saved views/i }));
    expect(screen.getByText(/no saved views/i)).toBeInTheDocument();
  });

  it('lists saved views in dropdown', async () => {
    const user = userEvent.setup();
    render(<SavedViewSelector {...defaultProps} views={sampleViews} />);

    await user.click(screen.getByRole('button', { name: /saved views/i }));
    expect(screen.getByText('Active Features')).toBeInTheDocument();
    expect(screen.getByText('Review Queue')).toBeInTheDocument();
  });

  it('clicking a view calls onApplyView with view id', async () => {
    const user = userEvent.setup();
    const onApplyView = vi.fn();
    render(<SavedViewSelector {...defaultProps} views={sampleViews} onApplyView={onApplyView} />);

    await user.click(screen.getByRole('button', { name: /saved views/i }));
    await user.click(screen.getByText('Active Features'));
    expect(onApplyView).toHaveBeenCalledWith('v1');
  });

  it('save button calls onSaveView with name and current filters', async () => {
    const user = userEvent.setup();
    const onSaveView = vi.fn();
    render(
      <SavedViewSelector {...defaultProps} currentFilters={activeFilters} onSaveView={onSaveView} />
    );

    await user.click(screen.getByRole('button', { name: /saved views/i }));
    // "Save current" is a DropdownMenuItem (menuitem role)
    await user.click(screen.getByRole('menuitem', { name: /save current/i }));

    const input = screen.getByPlaceholderText(/view name/i);
    await user.type(input, 'My View');
    await user.click(screen.getByRole('button', { name: /^save$/i }));

    expect(onSaveView).toHaveBeenCalledWith('My View', activeFilters);
  });

  it('delete button calls onDeleteView with view id', async () => {
    const user = userEvent.setup();
    const onDeleteView = vi.fn();
    render(<SavedViewSelector {...defaultProps} views={sampleViews} onDeleteView={onDeleteView} />);

    await user.click(screen.getByRole('button', { name: /saved views/i }));

    // Find the delete button for the first view
    const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
    await user.click(deleteButtons[0]);

    // Confirm deletion
    await user.click(screen.getByRole('button', { name: /confirm/i }));
    expect(onDeleteView).toHaveBeenCalledWith('v1');
  });
});
