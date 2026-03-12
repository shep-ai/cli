import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { ChatEmptyState } from './chat-empty-state';

const meta: Meta<typeof ChatEmptyState> = {
  title: 'Features/Chat/ChatEmptyState',
  component: ChatEmptyState,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  args: {
    onSuggestionClick: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
