import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DependencyList } from '@/components/features/dependency-inspector/dependency-list';
import type { FeatureNodeData } from '@/components/common/feature-node';

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

describe('DependencyList', () => {
  it('renders list of dependencies with name and status badge', () => {
    const items = [
      createFeatureData({ featureId: 'f1', name: 'Auth Module', state: 'running' }),
      createFeatureData({ featureId: 'f2', name: 'User Service', state: 'done' }),
    ];

    render(<DependencyList direction="upstream" items={items} />);

    expect(screen.getByText('Auth Module')).toBeInTheDocument();
    expect(screen.getByText('User Service')).toBeInTheDocument();
    expect(screen.getByText('Running')).toBeInTheDocument();
    expect(screen.getByText('Done')).toBeInTheDocument();
  });

  it('clicking a dependency calls onSelect with feature id', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    const items = [createFeatureData({ featureId: 'f1', name: 'Auth Module' })];

    render(<DependencyList direction="upstream" items={items} onSelect={onSelect} />);

    await user.click(screen.getByText('Auth Module'));
    expect(onSelect).toHaveBeenCalledWith('f1');
  });

  it('renders empty state when no dependencies provided', () => {
    render(<DependencyList direction="upstream" items={[]} />);
    expect(screen.getByText('No dependencies')).toBeInTheDocument();
  });

  it('renders correct section label for upstream direction', () => {
    render(<DependencyList direction="upstream" items={[]} />);
    expect(screen.getByText('Blocked by')).toBeInTheDocument();
  });

  it('renders correct section label for downstream direction', () => {
    render(<DependencyList direction="downstream" items={[]} />);
    expect(screen.getByText('Blocks')).toBeInTheDocument();
  });

  it('renders multiple dependencies in order', () => {
    const items = [
      createFeatureData({ featureId: 'f1', name: 'First' }),
      createFeatureData({ featureId: 'f2', name: 'Second' }),
      createFeatureData({ featureId: 'f3', name: 'Third' }),
    ];

    render(<DependencyList direction="downstream" items={items} />);

    const listItems = screen.getAllByRole('button');
    expect(listItems).toHaveLength(3);
    expect(listItems[0]).toHaveTextContent('First');
    expect(listItems[1]).toHaveTextContent('Second');
    expect(listItems[2]).toHaveTextContent('Third');
  });
});
