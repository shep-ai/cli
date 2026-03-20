import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { BranchSyncStatus } from './branch-sync-status';

const meta: Meta<typeof BranchSyncStatus> = {
  title: 'Drawers/Feature/Tabs/BranchSyncStatus',
  component: BranchSyncStatus,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
  },
  decorators: [
    (Story) => (
      <div style={{ height: '200px', width: '400px', border: '1px solid var(--color-border)' }}>
        <Story />
      </div>
    ),
  ],
  args: {
    onRefreshSync: fn(),
    onRebaseOnMain: fn(),
    rebaseLoading: false,
    rebaseError: null,
  },
};

export default meta;
type Story = StoryObj<typeof BranchSyncStatus>;

export const Loading: Story = {
  args: {
    syncStatus: null,
    syncLoading: true,
    syncError: null,
  },
};

export const UpToDate: Story = {
  args: {
    syncStatus: { ahead: 3, behind: 0, baseBranch: 'main', checkedAt: new Date().toISOString() },
    syncLoading: false,
    syncError: null,
  },
};

export const UpToDateNoAhead: Story = {
  args: {
    syncStatus: { ahead: 0, behind: 0, baseBranch: 'main', checkedAt: new Date().toISOString() },
    syncLoading: false,
    syncError: null,
  },
};

export const Behind: Story = {
  args: {
    syncStatus: { ahead: 5, behind: 3, baseBranch: 'main', checkedAt: new Date().toISOString() },
    syncLoading: false,
    syncError: null,
  },
};

export const BehindOneCommit: Story = {
  args: {
    syncStatus: { ahead: 0, behind: 1, baseBranch: 'main', checkedAt: new Date().toISOString() },
    syncLoading: false,
    syncError: null,
  },
};

export const Rebasing: Story = {
  args: {
    syncStatus: { ahead: 5, behind: 3, baseBranch: 'main', checkedAt: new Date().toISOString() },
    syncLoading: false,
    syncError: null,
    rebaseLoading: true,
  },
};

export const RebaseError: Story = {
  args: {
    syncStatus: { ahead: 5, behind: 3, baseBranch: 'main', checkedAt: new Date().toISOString() },
    syncLoading: false,
    syncError: null,
    rebaseError: 'Rebase failed: working directory has uncommitted changes',
  },
};

export const FetchError: Story = {
  args: {
    syncStatus: null,
    syncLoading: false,
    syncError: 'Failed to check sync status',
  },
};

export const Refreshing: Story = {
  args: {
    syncStatus: { ahead: 3, behind: 0, baseBranch: 'main', checkedAt: new Date().toISOString() },
    syncLoading: true,
    syncError: null,
  },
};
