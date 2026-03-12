import type { Meta, StoryObj } from '@storybook/react';
import { ChatPageClient } from './chat-page-client';

const meta = {
  title: 'Features/ChatPageClient',
  component: ChatPageClient,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof ChatPageClient>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
