import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BoardRow } from '@/components/features/board-view/board-row';
import type { FeatureNodeData } from '@/components/common/feature-node';
import { featureNodeStateConfig } from '@/components/common/feature-node';

// Mock next/image for brand icons
vi.mock('next/image', () => ({
  default: (props: Record<string, unknown>) => <img {...props} />,
}));

function createFeatureData(overrides: Partial<FeatureNodeData> = {}): FeatureNodeData {
  return {
    name: 'Test Feature',
    description: 'A test feature',
    featureId: 'feat-123',
    lifecycle: 'implementation',
    state: 'running',
    progress: 45,
    repositoryPath: '/repo/path',
    branch: 'feat/test',
    ...overrides,
  };
}

describe('BoardRow', () => {
  it('renders feature name', () => {
    render(<BoardRow data={createFeatureData({ name: 'My Feature' })} />);
    expect(screen.getByText('My Feature')).toBeInTheDocument();
  });

  it('renders status badge with correct icon and color for running state', () => {
    render(<BoardRow data={createFeatureData({ state: 'running' })} />);
    const badge = screen.getByTestId('board-row-status-badge');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveTextContent('Running');
  });

  it('renders status badge for creating state', () => {
    render(<BoardRow data={createFeatureData({ state: 'creating' })} />);
    const badge = screen.getByTestId('board-row-status-badge');
    expect(badge).toHaveTextContent('Creating...');
  });

  it('renders status badge for action-required state', () => {
    render(<BoardRow data={createFeatureData({ state: 'action-required' })} />);
    const badge = screen.getByTestId('board-row-status-badge');
    expect(badge).toHaveTextContent('User action required');
  });

  it('renders status badge for done state', () => {
    render(<BoardRow data={createFeatureData({ state: 'done' })} />);
    const badge = screen.getByTestId('board-row-status-badge');
    expect(badge).toHaveTextContent('Done');
  });

  it('renders status badge for blocked state', () => {
    render(<BoardRow data={createFeatureData({ state: 'blocked' })} />);
    const badge = screen.getByTestId('board-row-status-badge');
    expect(badge).toHaveTextContent('Blocked');
  });

  it('renders status badge for error state', () => {
    render(<BoardRow data={createFeatureData({ state: 'error' })} />);
    const badge = screen.getByTestId('board-row-status-badge');
    expect(badge).toHaveTextContent('Error');
  });

  it('uses correct color classes from featureNodeStateConfig for each state', () => {
    const states = ['creating', 'running', 'action-required', 'done', 'blocked', 'error'] as const;
    for (const state of states) {
      const { unmount } = render(<BoardRow data={createFeatureData({ state })} />);
      const badge = screen.getByTestId('board-row-status-badge');
      const config = featureNodeStateConfig[state];
      expect(badge.className).toContain(config.badgeClass);
      unmount();
    }
  });

  it('renders lifecycle label', () => {
    render(<BoardRow data={createFeatureData({ lifecycle: 'implementation' })} />);
    expect(screen.getByText('IMPLEMENTATION')).toBeInTheDocument();
  });

  it('renders progress bar when progress > 0', () => {
    render(<BoardRow data={createFeatureData({ progress: 60 })} />);
    const progressBar = screen.getByTestId('board-row-progress');
    expect(progressBar).toBeInTheDocument();
  });

  it('renders PR status when pr data is present', () => {
    render(
      <BoardRow
        data={createFeatureData({
          pr: { url: 'https://github.com/pr/1', number: 42, status: 'Open' as never },
        })}
      />
    );
    expect(screen.getByText('#42')).toBeInTheDocument();
  });

  it('does not render PR status when pr data is absent', () => {
    render(<BoardRow data={createFeatureData()} />);
    expect(screen.queryByTestId('board-row-pr')).not.toBeInTheDocument();
  });

  it('calls onSelect with feature data on click', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<BoardRow data={createFeatureData()} onSelect={onSelect} />);

    await user.click(screen.getByRole('option'));
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ featureId: 'feat-123' }));
  });

  it('has aria-selected="true" when selected', () => {
    render(<BoardRow data={createFeatureData()} isSelected />);
    expect(screen.getByRole('option')).toHaveAttribute('aria-selected', 'true');
  });

  it('has aria-selected="false" when not selected', () => {
    render(<BoardRow data={createFeatureData()} />);
    expect(screen.getByRole('option')).toHaveAttribute('aria-selected', 'false');
  });

  it('selected row has visual highlight', () => {
    render(<BoardRow data={createFeatureData()} isSelected />);
    const row = screen.getByRole('option');
    expect(row.className).toContain('bg-accent');
  });

  it('blocked feature shows blockedBy indicator', () => {
    render(
      <BoardRow
        data={createFeatureData({
          state: 'blocked',
          blockedBy: 'Parent Feature',
        })}
      />
    );
    expect(screen.getByText(/blocked by/i)).toBeInTheDocument();
    expect(screen.getByText(/Parent Feature/i)).toBeInTheDocument();
  });

  it('renders agent type icon when agentType is provided', () => {
    render(<BoardRow data={createFeatureData({ agentType: 'claude-code' })} />);
    expect(screen.getByTestId('board-row-agent-icon')).toBeInTheDocument();
  });

  it('shows hover actions on hover', async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn();
    const onDetails = vi.fn();
    render(<BoardRow data={createFeatureData({ onDelete })} onDetails={onDetails} />);

    const row = screen.getByRole('option');
    await user.hover(row);

    expect(screen.getByLabelText('View details')).toBeInTheDocument();
    expect(screen.getByLabelText('Delete feature')).toBeInTheDocument();
  });

  it('has role="option"', () => {
    render(<BoardRow data={createFeatureData()} />);
    expect(screen.getByRole('option')).toBeInTheDocument();
  });
});
