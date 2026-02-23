import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { PrStatus, CiStatus } from '@shepai/core/domain/generated/output';
import { MergeReview } from './merge-review';
import { MergeReviewDrawer } from './merge-review-drawer';
import type { MergeReviewData } from './merge-review-config';

const fullPr = {
  url: 'https://github.com/shep-ai/cli/pull/42',
  number: 42,
  status: PrStatus.Open,
  commitHash: 'a1b2c3d4e5f6789',
  ciStatus: CiStatus.Success,
} as const;

const samplePhases = [
  { id: 'phase-1', name: 'Foundation & Config', description: 'Set up types and server action' },
  { id: 'phase-2', name: 'Component Implementation', description: 'Build the merge review UI' },
  { id: 'phase-3', name: 'Integration & Wiring', description: 'Connect to control center' },
];

const sampleBranch = { source: 'feat/add-auth', target: 'main' };

const fullData: MergeReviewData = {
  pr: fullPr,
  branch: sampleBranch,
  phases: samplePhases,
  diffSummary: {
    filesChanged: 12,
    additions: 340,
    deletions: 85,
    commitCount: 5,
  },
};

const defaultActions = {
  onApprove: fn().mockName('onApprove'),
  onRefine: fn().mockName('onRefine'),
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
    ...defaultActions,
  },
};

/** CI status is Pending — shows yellow badge with spinner. */
export const CIPending: Story = {
  args: {
    data: {
      ...fullData,
      pr: { ...fullPr, ciStatus: CiStatus.Pending },
    },
    ...defaultActions,
  },
};

/** CI status is Failure — shows red badge. */
export const CIFailure: Story = {
  args: {
    data: {
      ...fullData,
      pr: { ...fullPr, ciStatus: CiStatus.Failure },
    },
    ...defaultActions,
  },
};

/** Diff summary unavailable — shows warning message. */
export const NoDiffSummary: Story = {
  args: {
    data: {
      pr: fullPr,
      branch: sampleBranch,
      warning: 'Diff statistics unavailable — worktree may have been removed',
    },
    ...defaultActions,
  },
};

/** CI status undefined — CI section omitted entirely. */
export const NoCIStatus: Story = {
  args: {
    data: {
      ...fullData,
      pr: { ...fullPr, ciStatus: undefined },
    },
    ...defaultActions,
  },
};

/** Processing state — approve button disabled with spinner. */
export const Processing: Story = {
  args: {
    data: fullData,
    ...defaultActions,
    isProcessing: true,
  },
};

/** No PR — merge without a pull request, shows branch direction and diff summary. */
export const NoPrWithDiff: Story = {
  args: {
    data: {
      branch: { source: 'feat/fix-login', target: 'main' },
      phases: samplePhases,
      diffSummary: fullData.diffSummary,
    },
    ...defaultActions,
  },
};

/** No PR and no diff — bare merge approval with branch info. */
export const NoPrNoDiff: Story = {
  args: {
    data: {
      branch: { source: 'feat/fix-login', target: 'main' },
      warning: 'No PR or diff data available',
    },
    ...defaultActions,
  },
};

/** With implementation phases shown. */
export const WithPhases: Story = {
  args: {
    data: {
      ...fullData,
      phases: samplePhases,
    },
    ...defaultActions,
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
      {...defaultActions}
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
      {...defaultActions}
      onDelete={fn().mockName('onDelete')}
    />
  ),
};

/** Drawer without PR — direct merge with diff summary and branch info. */
export const InDrawerNoPr: DrawerStory = {
  ...drawerMeta,
  render: () => (
    <DrawerTemplate
      featureName="Fix Login Bug"
      featureId="FEAT-099"
      repositoryPath="/home/user/projects/my-app"
      branch="feat/fix-login"
      data={{
        branch: { source: 'feat/fix-login', target: 'main' },
        phases: samplePhases,
        diffSummary: fullData.diffSummary,
      }}
      {...defaultActions}
      onDelete={fn().mockName('onDelete')}
    />
  ),
};
