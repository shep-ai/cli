import type { Meta, StoryObj } from '@storybook/react';
import { InlineAttachments } from './inline-attachments';

const meta: Meta<typeof InlineAttachments> = {
  title: 'Common/InlineAttachments',
  component: InlineAttachments,
  tags: ['autodocs'],
  parameters: { layout: 'padded' },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: '400px', border: '1px solid var(--color-border)', padding: '16px' }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof InlineAttachments>;

/** Plain text with no attachment references. */
export const PlainText: Story = {
  args: {
    text: 'Fix the login bug where users cannot sign in with Google OAuth.',
  },
};

/** Text with an image attachment reference. */
export const WithImageAttachment: Story = {
  args: {
    text: 'The button is misaligned, see screenshot:\n@/home/user/.shep/attachments/pending-abc/screenshot.png',
  },
};

/** Text with multiple attachment references. */
export const MultipleAttachments: Story = {
  args: {
    text: 'Before: @/home/user/.shep/attachments/pending-abc/before.png\nAfter: @/home/user/.shep/attachments/pending-abc/after.png',
  },
};

/** Text with a non-image file attachment. */
export const FileAttachment: Story = {
  args: {
    text: 'See the log file:\n@/home/user/.shep/attachments/pending-abc/error.log',
  },
};

/** Extra attachment paths passed via prop (e.g. rejection feedback). */
export const ExtraAttachmentPaths: Story = {
  args: {
    text: 'Please fix the layout issues',
    attachmentPaths: [
      '/home/user/.shep/attachments/pending-abc/screenshot1.png',
      '/home/user/.shep/attachments/pending-abc/screenshot2.png',
    ],
  },
};
