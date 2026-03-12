import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { DrawerActionBar } from './drawer-action-bar';

const meta: Meta<typeof DrawerActionBar> = {
  title: 'Drawers/Base/DrawerActionBar',
  component: DrawerActionBar,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  args: {
    onApprove: fn().mockName('onApprove'),
    approveLabel: 'Approve',
  },
  decorators: [
    (Story) => (
      <div className="w-[400px] rounded-md border">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof DrawerActionBar>;

/** Default — approve-only button (no reject input). */
export const Default: Story = {};

/** Two-button bar: Reject + Approve with slide-expand animation on hover. */
export const WithReject: Story = {
  args: {
    onReject: fn().mockName('onReject'),
    approveLabel: 'Approve',
  },
};

/** Processing state — all controls disabled. */
export const Processing: Story = {
  args: {
    onReject: fn().mockName('onReject'),
    approveLabel: 'Approve',
    isProcessing: true,
  },
};

/** Rejecting state — all controls disabled. */
export const Rejecting: Story = {
  args: {
    onReject: fn().mockName('onReject'),
    approveLabel: 'Approve',
    isRejecting: true,
  },
};

/** Custom revision placeholder. */
export const WithRevisionInput: Story = {
  args: {
    onReject: fn().mockName('onReject'),
    approveLabel: 'Approve Plan',
    revisionPlaceholder: 'Ask AI to revise the plan...',
  },
};

/** Long approve label — e.g. "Approve Requirements" from PRD review. */
export const LongApproveLabel: Story = {
  args: {
    onReject: fn().mockName('onReject'),
    approveLabel: 'Approve Requirements',
  },
};
