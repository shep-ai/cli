import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OpenActionMenu } from '@/components/common/open-action-menu/open-action-menu';
import type { FeatureActionsState } from '@/components/common/feature-drawer/use-feature-actions';

const defaultActions: FeatureActionsState = {
  openInIde: vi.fn(),
  openInShell: vi.fn(),
  openSpecsFolder: vi.fn(),
  ideLoading: false,
  shellLoading: false,
  specsLoading: false,
  ideError: null,
  shellError: null,
  specsError: null,
};

describe('OpenActionMenu', () => {
  it('renders the Open trigger button', () => {
    render(<OpenActionMenu actions={defaultActions} copyPath="/home/user/repo" showSpecs />);

    expect(screen.getByRole('button', { name: /open/i })).toBeInTheDocument();
  });

  it('shows dropdown items when clicked', async () => {
    const user = userEvent.setup();
    render(<OpenActionMenu actions={defaultActions} copyPath="/home/user/repo" showSpecs />);

    await user.click(screen.getByRole('button', { name: /open/i }));

    expect(screen.getByText('IDE')).toBeInTheDocument();
    expect(screen.getByText('Terminal')).toBeInTheDocument();
    expect(screen.getByText('Specs Folder')).toBeInTheDocument();
    expect(screen.getByText('Copy path')).toBeInTheDocument();
  });

  it('calls openInIde when IDE item is clicked', async () => {
    const actions = { ...defaultActions, openInIde: vi.fn() };
    const user = userEvent.setup();
    render(<OpenActionMenu actions={actions} copyPath="/home/user/repo" showSpecs />);

    await user.click(screen.getByRole('button', { name: /open/i }));
    await user.click(screen.getByText('IDE'));

    expect(actions.openInIde).toHaveBeenCalledTimes(1);
  });

  it('calls openInShell when Terminal item is clicked', async () => {
    const actions = { ...defaultActions, openInShell: vi.fn() };
    const user = userEvent.setup();
    render(<OpenActionMenu actions={actions} copyPath="/home/user/repo" showSpecs />);

    await user.click(screen.getByRole('button', { name: /open/i }));
    await user.click(screen.getByText('Terminal'));

    expect(actions.openInShell).toHaveBeenCalledTimes(1);
  });

  it('calls openSpecsFolder when Specs Folder item is clicked', async () => {
    const actions = { ...defaultActions, openSpecsFolder: vi.fn() };
    const user = userEvent.setup();
    render(<OpenActionMenu actions={actions} copyPath="/home/user/repo" showSpecs />);

    await user.click(screen.getByRole('button', { name: /open/i }));
    await user.click(screen.getByText('Specs Folder'));

    expect(actions.openSpecsFolder).toHaveBeenCalledTimes(1);
  });

  it('disables trigger button when any action is loading', () => {
    render(
      <OpenActionMenu
        actions={{ ...defaultActions, ideLoading: true }}
        copyPath="/home/user/repo"
        showSpecs
      />
    );

    expect(screen.getByRole('button', { name: /open/i })).toBeDisabled();
  });

  it('disables Specs Folder item when showSpecs is false', async () => {
    const user = userEvent.setup();
    render(
      <OpenActionMenu actions={defaultActions} copyPath="/home/user/repo" showSpecs={false} />
    );

    await user.click(screen.getByRole('button', { name: /open/i }));

    const specsItem = screen.getByText('Specs Folder').closest('[role="menuitem"]');
    expect(specsItem).toHaveAttribute('data-disabled');
  });

  it('shows Copy path item in the dropdown', async () => {
    const user = userEvent.setup();
    render(<OpenActionMenu actions={defaultActions} copyPath="/home/user/repo" showSpecs />);

    await user.click(screen.getByRole('button', { name: /open/i }));

    expect(screen.getByText('Copy path')).toBeInTheDocument();
  });
});
