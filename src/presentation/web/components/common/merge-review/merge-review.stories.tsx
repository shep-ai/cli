import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { PrStatus, CiStatus } from '@shepai/core/domain/generated/output';
import { MergeReview } from './merge-review';
import { MergeReviewDrawer } from './merge-review-drawer';
import type { MergeReviewData } from './merge-review-config';

const fullData: MergeReviewData = {
  pr: {
    url: 'https://github.com/shep-ai/cli/pull/42',
    number: 42,
    status: PrStatus.Open,
    commitHash: 'a1b2c3d4e5f6789',
    ciStatus: CiStatus.Success,
  },
  diffSummary: {
    filesChanged: 12,
    additions: 340,
    deletions: 85,
    commitCount: 5,
  },
};

/* ─── Standalone MergeReview ─── */

const meta: Meta<typeof MergeReview> = {
  title: 'Common/MergeReview',
  component: MergeReview,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
  },
  decorators: [
    (Story) => (
      <div style={{ height: '600px', width: '400px', border: '1px solid var(--color-border)' }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof MergeReview>;

/** Default — all data present with CI success. */
export const Default: Story = {
  args: {
    data: fullData,
    onApprove: fn().mockName('onApprove'),
  },
};

/** CI status is Pending — shows yellow badge with spinner. */
export const CIPending: Story = {
  args: {
    data: {
      ...fullData,
      pr: { ...fullData.pr, ciStatus: CiStatus.Pending },
    },
    onApprove: fn().mockName('onApprove'),
  },
};

/** CI status is Failure — shows red badge. */
export const CIFailure: Story = {
  args: {
    data: {
      ...fullData,
      pr: { ...fullData.pr, ciStatus: CiStatus.Failure },
    },
    onApprove: fn().mockName('onApprove'),
  },
};

/** Diff summary unavailable — shows warning message. */
export const NoDiffSummary: Story = {
  args: {
    data: {
      pr: fullData.pr,
      warning: 'Diff statistics unavailable — worktree may have been removed',
    },
    onApprove: fn().mockName('onApprove'),
  },
};

/** CI status undefined — CI section omitted entirely. */
export const NoCIStatus: Story = {
  args: {
    data: {
      ...fullData,
      pr: { ...fullData.pr, ciStatus: undefined },
    },
    onApprove: fn().mockName('onApprove'),
  },
};

/** Processing state — approve button disabled with spinner. */
export const Processing: Story = {
  args: {
    data: fullData,
    onApprove: fn().mockName('onApprove'),
    isProcessing: true,
  },
};

/* ─── Drawer Variant ─── */

type DrawerStory = StoryObj<typeof MergeReviewDrawer>;

const drawerMeta = {
  title: 'Common/MergeReviewDrawer',
  component: MergeReviewDrawer,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
  },
};

function DrawerTemplate(
  props: Omit<React.ComponentProps<typeof MergeReviewDrawer>, 'open' | 'onClose'>
) {
  const [open, setOpen] = useState(true);

  return (
    <div style={{ height: '100vh', background: '#f8fafc', padding: '2rem' }}>
      <button
        type="button"
        onClick={() => setOpen(true)}
        style={{ padding: '8px 16px', border: '1px solid #ccc', borderRadius: '6px' }}
      >
        Open Drawer
      </button>
      <MergeReviewDrawer {...props} open={open} onClose={() => setOpen(false)} />
    </div>
  );
}

/** Merge review drawer with full data. */
export const InDrawer: DrawerStory = {
  ...drawerMeta,
  render: () => (
    <DrawerTemplate
      featureName="Add User Authentication"
      featureId="FEAT-042"
      repositoryPath="/home/user/projects/my-app"
      branch="feat/add-auth"
      data={fullData}
      onApprove={fn().mockName('onApprove')}
    />
  ),
};

/** Drawer with delete button visible. */
export const WithDeleteButton: DrawerStory = {
  ...drawerMeta,
  render: () => (
    <DrawerTemplate
      featureName="Add User Authentication"
      featureId="FEAT-042"
      repositoryPath="/home/user/projects/my-app"
      branch="feat/add-auth"
      data={fullData}
      onApprove={fn().mockName('onApprove')}
      onDelete={fn().mockName('onDelete')}
    />
  ),
};
