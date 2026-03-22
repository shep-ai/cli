import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BranchSyncStatus } from '@/presentation/web/components/common/feature-drawer-tabs/branch-sync-status';

const baseSyncData = {
  ahead: 3,
  behind: 0,
  baseBranch: 'main',
  checkedAt: new Date().toISOString(),
};

const defaultProps = {
  syncStatus: baseSyncData,
  syncLoading: false,
  syncError: null,
  onRefreshSync: vi.fn(),
  onRebaseOnMain: vi.fn(),
  rebaseLoading: false,
  rebaseError: null,
};

describe('BranchSyncStatus', () => {
  it('should show loading state on initial fetch', () => {
    render(<BranchSyncStatus {...defaultProps} syncStatus={null} syncLoading={true} />);
    expect(screen.getByText('Checking...')).toBeInTheDocument();
  });

  it('should show up-to-date status with green check', () => {
    render(<BranchSyncStatus {...defaultProps} />);
    expect(screen.getByText(/Up to date with/)).toBeInTheDocument();
    expect(screen.getByText('main')).toBeInTheDocument();
  });

  it('should show ahead count when ahead > 0 and up to date', () => {
    render(<BranchSyncStatus {...defaultProps} />);
    expect(screen.getByText(/3 ahead/)).toBeInTheDocument();
  });

  it('should show behind count with warning', () => {
    render(
      <BranchSyncStatus {...defaultProps} syncStatus={{ ...baseSyncData, behind: 5, ahead: 2 }} />
    );
    expect(screen.getByText(/5 commits behind/)).toBeInTheDocument();
    expect(screen.getByText(/2 ahead/)).toBeInTheDocument();
  });

  it('should show singular "commit" for 1 behind', () => {
    render(<BranchSyncStatus {...defaultProps} syncStatus={{ ...baseSyncData, behind: 1 }} />);
    expect(screen.getByText(/1 commit behind/)).toBeInTheDocument();
  });

  it('should show rebase button when behind', () => {
    render(<BranchSyncStatus {...defaultProps} syncStatus={{ ...baseSyncData, behind: 3 }} />);
    expect(screen.getByText('Rebase on Main')).toBeInTheDocument();
  });

  it('should not show rebase button when up to date', () => {
    render(<BranchSyncStatus {...defaultProps} />);
    expect(screen.queryByText('Rebase on Main')).not.toBeInTheDocument();
  });

  it('should show rebasing state', () => {
    render(<BranchSyncStatus {...defaultProps} rebaseLoading={true} />);
    expect(screen.getByText(/Rebasing on/)).toBeInTheDocument();
  });

  it('should show fetch error', () => {
    render(
      <BranchSyncStatus
        {...defaultProps}
        syncStatus={null}
        syncError="Failed to check sync status"
      />
    );
    expect(screen.getByText('Failed to check sync status')).toBeInTheDocument();
  });

  it('should show rebase error', () => {
    render(
      <BranchSyncStatus
        {...defaultProps}
        syncStatus={{ ...baseSyncData, behind: 3 }}
        rebaseError="Rebase failed: dirty worktree"
      />
    );
    expect(screen.getByText('Rebase failed: dirty worktree')).toBeInTheDocument();
  });

  it('should call onRefreshSync when refresh button clicked', async () => {
    const onRefreshSync = vi.fn();
    render(<BranchSyncStatus {...defaultProps} onRefreshSync={onRefreshSync} />);
    await userEvent.click(screen.getByTestId('sync-refresh-button'));
    expect(onRefreshSync).toHaveBeenCalled();
  });

  it('should call onRebaseOnMain when rebase button clicked', async () => {
    const onRebaseOnMain = vi.fn();
    render(
      <BranchSyncStatus
        {...defaultProps}
        syncStatus={{ ...baseSyncData, behind: 2 }}
        onRebaseOnMain={onRebaseOnMain}
      />
    );
    await userEvent.click(screen.getByText('Rebase on Main'));
    expect(onRebaseOnMain).toHaveBeenCalled();
  });
});
