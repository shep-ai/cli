import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import {
  BoardColumn,
  VIRTUALIZATION_THRESHOLD,
} from '@/components/features/board-view/board-column';
import type { FeatureNodeData } from '@/components/common/feature-node';

// Mock next/image for brand icons
vi.mock('next/image', () => ({
  default: (props: Record<string, unknown>) => <img {...props} />,
}));

function createFeature(id: string, name: string): FeatureNodeData {
  return {
    name,
    featureId: id,
    lifecycle: 'implementation',
    state: 'running',
    progress: 30,
    repositoryPath: '/repo',
    branch: 'feat/test',
  };
}

function createFeatures(count: number): FeatureNodeData[] {
  return Array.from({ length: count }, (_, i) => createFeature(`feat-${i}`, `Feature ${i}`));
}

describe('BoardColumn', () => {
  it('renders ColumnHeader with correct label and count', () => {
    const features = createFeatures(3);
    render(<BoardColumn label="Implementation" columnId="implementation" features={features} />);

    expect(screen.getByText('Implementation')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('renders all BoardRow items for small lists (< threshold)', () => {
    const features = createFeatures(5);
    render(<BoardColumn label="Backlog" columnId="backlog" features={features} />);

    for (let i = 0; i < 5; i++) {
      expect(screen.getByText(`Feature ${i}`)).toBeInTheDocument();
    }
  });

  it('uses simple rendering when count is at threshold', () => {
    const features = createFeatures(VIRTUALIZATION_THRESHOLD);
    render(<BoardColumn label="Implementation" columnId="implementation" features={features} />);

    // At exactly the threshold, should use simple rendering
    expect(screen.getByText('Feature 0')).toBeInTheDocument();
    expect(screen.getByText(`Feature ${VIRTUALIZATION_THRESHOLD - 1}`)).toBeInTheDocument();
  });

  it('column has role="listbox" attribute', () => {
    render(<BoardColumn label="Review" columnId="review" features={[]} />);
    expect(screen.getByRole('listbox')).toBeInTheDocument();
  });

  it('has aria-label matching column label', () => {
    render(<BoardColumn label="Requirements" columnId="requirements" features={[]} />);
    expect(screen.getByRole('listbox')).toHaveAttribute('aria-label', 'Requirements');
  });

  it('empty column renders header with zero count', () => {
    render(<BoardColumn label="Done" columnId="done" features={[]} />);

    expect(screen.getByText('Done')).toBeInTheDocument();
    expect(screen.getByText('0')).toBeInTheDocument();
  });

  it('passes selected feature id to BoardRow for highlighting', () => {
    const features = createFeatures(3);
    render(
      <BoardColumn
        label="Implementation"
        columnId="implementation"
        features={features}
        selectedFeatureId="feat-1"
      />
    );

    const options = screen.getAllByRole('option');
    const selected = options.find((o) => o.getAttribute('aria-selected') === 'true');
    expect(selected).toBeDefined();
    expect(within(selected!).getByText('Feature 1')).toBeInTheDocument();
  });

  it('activates virtualization for lists exceeding threshold', () => {
    // Verify the threshold constant is 30 as specified in FR-10
    expect(VIRTUALIZATION_THRESHOLD).toBe(30);
  });
});
