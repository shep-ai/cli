import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OpenActionMenu } from '@/components/common/open-action-menu/open-action-menu';
import type { FeatureActionsState } from '@/components/common/feature-drawer/use-feature-actions';

const defaultActions: FeatureActionsState = {
  openInIde: vi.fn(),
  openInShell: vi.fn(),
  openFolder: vi.fn(),
  openSpecsFolder: vi.fn(),
  rebaseOnMain: vi.fn(),
  ideLoading: false,
  shellLoading: false,
  folderLoading: false,
  specsLoading: false,
  rebaseLoading: false,
  ideError: null,
  shellError: null,
  folderError: null,
  specsError: null,
  rebaseError: null,
};

describe('OpenActionMenu', () => {
  it('renders toolbar buttons for IDE, terminal, folder, and copy', () => {
    render(<OpenActionMenu actions={defaultActions} repositoryPath="/home/user/repo" showSpecs />);

    expect(screen.getByRole('button', { name: 'Open in IDE' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Open terminal' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Open folder' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Open specs' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Copy path' })).toBeInTheDocument();
  });

  it('calls openInIde when IDE button is clicked', async () => {
    const actions = { ...defaultActions, openInIde: vi.fn() };
    const user = userEvent.setup();
    render(<OpenActionMenu actions={actions} repositoryPath="/home/user/repo" showSpecs />);

    await user.click(screen.getByRole('button', { name: 'Open in IDE' }));

    expect(actions.openInIde).toHaveBeenCalledTimes(1);
  });

  it('calls openInShell when terminal button is clicked', async () => {
    const actions = { ...defaultActions, openInShell: vi.fn() };
    const user = userEvent.setup();
    render(<OpenActionMenu actions={actions} repositoryPath="/home/user/repo" showSpecs />);

    await user.click(screen.getByRole('button', { name: 'Open terminal' }));

    expect(actions.openInShell).toHaveBeenCalledTimes(1);
  });

  it('calls openFolder when folder button is clicked', async () => {
    const actions = { ...defaultActions, openFolder: vi.fn() };
    const user = userEvent.setup();
    render(<OpenActionMenu actions={actions} repositoryPath="/home/user/repo" showSpecs />);

    await user.click(screen.getByRole('button', { name: 'Open folder' }));

    expect(actions.openFolder).toHaveBeenCalledTimes(1);
  });

  it('calls openSpecsFolder when specs button is clicked', async () => {
    const actions = { ...defaultActions, openSpecsFolder: vi.fn() };
    const user = userEvent.setup();
    render(<OpenActionMenu actions={actions} repositoryPath="/home/user/repo" showSpecs />);

    await user.click(screen.getByRole('button', { name: 'Open specs' }));

    expect(actions.openSpecsFolder).toHaveBeenCalledTimes(1);
  });

  it('disables IDE button when ideLoading is true', () => {
    render(
      <OpenActionMenu
        actions={{ ...defaultActions, ideLoading: true }}
        repositoryPath="/home/user/repo"
        showSpecs
      />
    );

    expect(screen.getByRole('button', { name: 'Open in IDE' })).toBeDisabled();
  });

  it('hides specs button when showSpecs is false', () => {
    render(
      <OpenActionMenu actions={defaultActions} repositoryPath="/home/user/repo" showSpecs={false} />
    );

    expect(screen.queryByRole('button', { name: 'Open specs' })).not.toBeInTheDocument();
  });

  it('copies repositoryPath when worktreePath is not provided', async () => {
    const writeText = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<OpenActionMenu actions={defaultActions} repositoryPath="/home/user/repo" showSpecs />);

    await user.click(screen.getByRole('button', { name: 'Copy path' }));

    expect(writeText).toHaveBeenCalledWith('/home/user/repo');
    writeText.mockRestore();
  });

  it('copies worktreePath when provided', async () => {
    const writeText = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(
      <OpenActionMenu
        actions={defaultActions}
        repositoryPath="/home/user/repo"
        worktreePath="/home/user/repo/.worktrees/feature-login"
        showSpecs
      />
    );

    await user.click(screen.getByRole('button', { name: 'Copy path' }));

    expect(writeText).toHaveBeenCalledWith('/home/user/repo/.worktrees/feature-login');
    writeText.mockRestore();
  });
});
