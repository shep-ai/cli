import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { Check } from 'lucide-react';
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

/** Default — approve button only. Plays "approve" sound on click. */
export const Default: Story = {};

/** With approve icon. */
export const WithIcon: Story = {
  args: {
    approveLabel: 'Approve PRD',
    approveIcon: <Check className="mr-1.5 h-4 w-4" />,
  },
};

/** With reject button. Plays "reject" sound on reject click, "approve" on approve. */
export const WithReject: Story = {
  args: {
    onReject: fn().mockName('onReject'),
    approveLabel: 'Approve',
  },
};

/** Processing state — buttons disabled, no sounds play. */
export const Processing: Story = {
  args: {
    onReject: fn().mockName('onReject'),
    approveLabel: 'Approve',
    isProcessing: true,
  },
};

/** Rejecting state — buttons disabled. */
export const Rejecting: Story = {
  args: {
    onReject: fn().mockName('onReject'),
    approveLabel: 'Approve',
    isRejecting: true,
  },
};

/** With revision input and reject button. */
export const WithRevisionInput: Story = {
  args: {
    onReject: fn().mockName('onReject'),
    approveLabel: 'Approve',
    revisionPlaceholder: 'Ask AI to revise the plan...',
  },
};

/** Custom reject dialog title. */
export const CustomRejectTitle: Story = {
  args: {
    onReject: fn().mockName('onReject'),
    approveLabel: 'Approve Plan',
    rejectDialogTitle: 'Reject Plan',
  },
};
