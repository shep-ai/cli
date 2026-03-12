import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { ChatHeader } from './chat-header';

const meta: Meta<typeof ChatHeader> = {
  title: 'Features/Chat/ChatHeader',
  component: ChatHeader,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
  },
  args: {
    onClear: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Streaming: Story = {
  args: {
    isStreaming: true,
  },
};
