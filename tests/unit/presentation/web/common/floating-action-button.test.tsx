import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Plus, FolderPlus } from 'lucide-react';
import {
  FloatingActionButton,
  type FloatingActionButtonAction,
} from '@/components/common/floating-action-button';

function createActions(
  overrides?: Partial<FloatingActionButtonAction>[]
): FloatingActionButtonAction[] {
  const defaults: FloatingActionButtonAction[] = [
    {
      id: 'new-feature',
      label: 'Feature',
      icon: <Plus className="h-5 w-5" />,
      onClick: vi.fn(),
    },
    {
      id: 'add-repository',
      label: 'Repository',
      icon: <FolderPlus className="h-5 w-5" />,
      onClick: vi.fn(),
    },
  ];
  if (overrides) {
    return defaults.map((d, i) => ({ ...d, ...overrides[i] }));
  }
  return defaults;
}

describe('FloatingActionButton', () => {
  it('renders the fab trigger button', () => {
    render(<FloatingActionButton actions={createActions()} />);
    expect(screen.getByTestId('fab-trigger')).toBeInTheDocument();
  });

  it('shows action items when clicked', async () => {
    const user = userEvent.setup();
    render(<FloatingActionButton actions={createActions()} />);

    await user.click(screen.getByTestId('fab-trigger'));

    expect(screen.getByTestId('fab-action-new-feature')).toBeInTheDocument();
    expect(screen.getByTestId('fab-action-add-repository')).toBeInTheDocument();
  });

  it('calls action onClick and closes when an action is clicked', async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();
    const actions = createActions([{ onClick }]);

    render(<FloatingActionButton actions={actions} />);

    await user.click(screen.getByTestId('fab-trigger'));
    await user.click(screen.getByTestId('fab-action-new-feature'));

    expect(onClick).toHaveBeenCalledOnce();
    // Should close after clicking action
    expect(screen.getByTestId('fab-trigger')).toHaveAttribute('aria-label', 'Create new');
  });

  it('closes when clicking outside', async () => {
    const user = userEvent.setup();
    render(<FloatingActionButton actions={createActions()} />);

    await user.click(screen.getByTestId('fab-trigger'));
    expect(screen.getByTestId('fab-overlay')).toBeInTheDocument();

    await user.click(screen.getByTestId('fab-overlay'));
    expect(screen.getByTestId('fab-trigger')).toHaveAttribute('aria-label', 'Create new');
  });

  it('closes when escape is pressed', async () => {
    const user = userEvent.setup();
    render(<FloatingActionButton actions={createActions()} />);

    await user.click(screen.getByTestId('fab-trigger'));
    expect(screen.getByTestId('fab-trigger')).toHaveAttribute('aria-label', 'Close actions');

    await user.keyboard('{Escape}');
    expect(screen.getByTestId('fab-trigger')).toHaveAttribute('aria-label', 'Create new');
  });

  it('shows loading spinner when action is loading', async () => {
    const user = userEvent.setup();
    const actions = createActions([{}, { loading: true }]);

    render(<FloatingActionButton actions={actions} />);
    await user.click(screen.getByTestId('fab-trigger'));

    const addRepoBtn = screen.getByTestId('fab-action-add-repository');
    expect(addRepoBtn).toBeDisabled();
  });

  it('applies custom className', () => {
    render(<FloatingActionButton actions={createActions()} className="custom-class" />);
    expect(screen.getByTestId('floating-action-button')).toHaveClass('custom-class');
  });

  it('has correct aria-label based on open state', async () => {
    const user = userEvent.setup();
    render(<FloatingActionButton actions={createActions()} />);

    const trigger = screen.getByTestId('fab-trigger');
    expect(trigger).toHaveAttribute('aria-label', 'Create new');

    await user.click(trigger);
    expect(trigger).toHaveAttribute('aria-label', 'Close actions');
  });

  it('renders action labels as pill text', async () => {
    const user = userEvent.setup();
    render(<FloatingActionButton actions={createActions()} />);

    await user.click(screen.getByTestId('fab-trigger'));

    expect(screen.getByText('Feature')).toBeInTheDocument();
    expect(screen.getByText('Repository')).toBeInTheDocument();
  });

  it('does not render overlay when closed', () => {
    render(<FloatingActionButton actions={createActions()} />);
    expect(screen.queryByTestId('fab-overlay')).not.toBeInTheDocument();
  });
});
