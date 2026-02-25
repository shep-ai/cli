import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { RejectFeedbackDialog } from './reject-feedback-dialog';

const meta: Meta<typeof RejectFeedbackDialog> = {
  title: 'Composed/RejectFeedbackDialog',
  component: RejectFeedbackDialog,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  args: {
    open: true,
    onOpenChange: fn().mockName('onOpenChange'),
    onConfirm: fn().mockName('onConfirm'),
    isSubmitting: false,
  },
};

export default meta;
type Story = StoryObj<typeof RejectFeedbackDialog>;

/** Default — dialog open with empty feedback; confirm button disabled. */
export const Default: Story = {};

/** With feedback entered — confirm button enabled. */
export const WithFeedback: Story = {
  play: async ({ canvasElement }) => {
    // Type feedback into the textarea to show enabled state
    const textarea = canvasElement.ownerDocument.querySelector(
      'textarea[aria-label="Rejection feedback"]'
    ) as HTMLTextAreaElement | null;
    if (textarea) {
      // Simulate React-compatible input
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
        window.HTMLTextAreaElement.prototype,
        'value'
      )?.set;
      nativeInputValueSetter?.call(
        textarea,
        'The requirements are missing error handling for edge cases. Please add validation for empty inputs.'
      );
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
      textarea.dispatchEvent(new Event('change', { bubbles: true }));
    }
  },
};

/** Submitting state — spinner shown, buttons disabled. */
export const Submitting: Story = {
  args: {
    isSubmitting: true,
  },
};

/** Custom title and description for tech decisions context. */
export const CustomTitle: Story = {
  args: {
    title: 'Reject Plan',
    description:
      'Provide feedback on the technical plan for the agent to revise. Be specific about which decisions need changes.',
  },
};
