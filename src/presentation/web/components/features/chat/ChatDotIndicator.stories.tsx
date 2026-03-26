import type { Meta, StoryObj } from '@storybook/react';
import { ChatDotIndicator } from './ChatDotIndicator';

const meta: Meta<typeof ChatDotIndicator> = {
  title: 'Features/Chat/ChatDotIndicator',
  component: ChatDotIndicator,
  decorators: [
    (Story) => (
      <div className="relative inline-block rounded-md bg-zinc-800 p-4">
        <span className="text-white">Chat</span>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof ChatDotIndicator>;

export const Idle: Story = {
  args: { status: 'idle' },
};

export const Processing: Story = {
  args: { status: 'processing' },
};

export const Unread: Story = {
  args: { status: 'unread' },
};
