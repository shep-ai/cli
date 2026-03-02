import { Check } from 'lucide-react';
import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { DecisionChatPanel } from './decision-chat-panel';

const meta: Meta<typeof DecisionChatPanel> = {
  title: 'Drawers/Review/DecisionChatPanel',
  component: DecisionChatPanel,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
  },
  decorators: [
    (Story) => (
      <div
        style={{
          height: '500px',
          width: '400px',
          border: '1px solid var(--color-border)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-end',
        }}
      >
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof DecisionChatPanel>;

const defaultReviewContext = {
  name: 'Agent Executor Abstraction',
  summary: 'Research into abstracting agent executors',
  decisions: [{ title: 'Agent Framework', chosen: 'LangGraph', rejected: ['Custom', 'Temporal'] }],
};

/** Empty chat — no messages yet, input ready. */
export const Empty: Story = {
  args: {
    featureId: 'feat-001',
    reviewType: 'tech',
    reviewContext: defaultReviewContext,
    onApprove: fn().mockName('onApprove'),
    onReject: fn().mockName('onReject'),
    approveLabel: 'Approve Plan',
    approveIcon: <Check className="mr-1.5 h-4 w-4" />,
  },
};

/** Processing state — all buttons disabled. */
export const Processing: Story = {
  args: {
    featureId: 'feat-001',
    reviewType: 'tech',
    reviewContext: defaultReviewContext,
    onApprove: fn().mockName('onApprove'),
    onReject: fn().mockName('onReject'),
    approveLabel: 'Approve Plan',
    approveIcon: <Check className="mr-1.5 h-4 w-4" />,
    isProcessing: true,
  },
};

/** Rejecting state — buttons disabled while reject in flight. */
export const Rejecting: Story = {
  args: {
    featureId: 'feat-001',
    reviewType: 'tech',
    reviewContext: defaultReviewContext,
    onApprove: fn().mockName('onApprove'),
    onReject: fn().mockName('onReject'),
    approveLabel: 'Approve Plan',
    approveIcon: <Check className="mr-1.5 h-4 w-4" />,
    isRejecting: true,
  },
};

/** Without reject — only approve button visible. */
export const ApproveOnly: Story = {
  args: {
    featureId: 'feat-001',
    reviewType: 'prd',
    reviewContext: defaultReviewContext,
    onApprove: fn().mockName('onApprove'),
    approveLabel: 'Approve Requirements',
    approveIcon: <Check className="mr-1.5 h-4 w-4" />,
  },
};

/** With children — progress bar between messages and input. */
export const WithChildren: Story = {
  args: {
    featureId: 'feat-001',
    reviewType: 'prd',
    reviewContext: defaultReviewContext,
    onApprove: fn().mockName('onApprove'),
    onReject: fn().mockName('onReject'),
    approveLabel: 'Approve Requirements',
    approveIcon: <Check className="mr-1.5 h-4 w-4" />,
    children: (
      <div className="bg-muted h-1.5 overflow-hidden opacity-100 transition-opacity duration-200">
        <div className="bg-primary h-full transition-all duration-300" style={{ width: '60%' }} />
      </div>
    ),
  },
};
