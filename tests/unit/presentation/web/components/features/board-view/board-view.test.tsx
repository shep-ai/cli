import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BoardView } from '@/components/features/board-view/board-view';
import type { FeatureNodeData } from '@/components/common/feature-node';
import type { FilterState } from '@/hooks/use-filter-state';

// Mock next/image for brand icons
vi.mock('next/image', () => ({
  default: (props: Record<string, unknown>) => <img {...props} />,
}));

const emptyFilters: FilterState = {
  lifecycle: new Set(),
  status: new Set(),
  agentType: new Set(),
  repository: new Set(),
};

function createFeature(
  id: string,
  lifecycle: FeatureNodeData['lifecycle'],
  name: string
): FeatureNodeData {
  return {
    name,
    featureId: id,
    lifecycle,
    state: 'running',
    progress: 40,
    repositoryPath: '/repo',
    branch: `feat/${id}`,
  };
}

describe('BoardView', () => {
  it('renders 5 columns with correct labels', () => {
    render(<BoardView features={[]} filters={emptyFilters} />);

    expect(screen.getByText('Backlog')).toBeInTheDocument();
    expect(screen.getByText('Requirements')).toBeInTheDocument();
    expect(screen.getByText('Implementation')).toBeInTheDocument();
    expect(screen.getByText('Review')).toBeInTheDocument();
    expect(screen.getByText('Done')).toBeInTheDocument();
  });

  it('distributes features to correct columns', () => {
    const features = [
      createFeature('f1', 'requirements', 'Req Feature'),
      createFeature('f2', 'implementation', 'Impl Feature'),
      createFeature('f3', 'review', 'Rev Feature'),
      createFeature('f4', 'maintain', 'Done Feature'),
    ];

    render(<BoardView features={features} filters={emptyFilters} />);

    expect(screen.getByText('Req Feature')).toBeInTheDocument();
    expect(screen.getByText('Impl Feature')).toBeInTheDocument();
    expect(screen.getByText('Rev Feature')).toBeInTheDocument();
    expect(screen.getByText('Done Feature')).toBeInTheDocument();
  });

  it('clicking a row triggers onSelect', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    const features = [createFeature('f1', 'implementation', 'My Feature')];

    render(<BoardView features={features} filters={emptyFilters} onSelect={onSelect} />);

    await user.click(screen.getByText('My Feature'));
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ featureId: 'f1' }));
  });

  it('renders with empty data (5 empty columns)', () => {
    render(<BoardView features={[]} filters={emptyFilters} />);

    // All columns should show zero count
    const zeros = screen.getAllByText('0');
    expect(zeros.length).toBe(5);
  });

  it('renders filter bar slot', () => {
    render(
      <BoardView
        features={[]}
        filters={emptyFilters}
        filterBar={<div data-testid="filter-bar-slot">Filters</div>}
      />
    );

    expect(screen.getByTestId('filter-bar-slot')).toBeInTheDocument();
  });

  it('highlights selected feature', () => {
    const features = [
      createFeature('f1', 'implementation', 'Feature A'),
      createFeature('f2', 'implementation', 'Feature B'),
    ];

    render(<BoardView features={features} filters={emptyFilters} selectedFeatureId="f1" />);

    const options = screen.getAllByRole('option');
    const selected = options.find((o) => o.getAttribute('aria-selected') === 'true');
    expect(selected).toBeDefined();
  });
});
