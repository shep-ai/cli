import type { Meta, StoryObj } from '@storybook/react';
import { ChatPageClient } from './chat-page-client';

const meta: Meta<typeof ChatPageClient> = {
  title: 'Features/Chat/ChatPageClient',
  component: ChatPageClient,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
  },
  decorators: [
    (Story) => (
      <div style={{ height: '600px' }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
