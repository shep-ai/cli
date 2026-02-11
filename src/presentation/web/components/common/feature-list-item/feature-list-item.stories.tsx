import type { Meta, StoryObj } from '@storybook/react';
import { SidebarProvider, SidebarMenu } from '@/components/ui/sidebar';
import { FeatureListItem } from './feature-list-item';

const meta: Meta<typeof FeatureListItem> = {
  title: 'Composed/FeatureListItem',
  component: FeatureListItem,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <SidebarProvider>
        <SidebarMenu>
          <Story />
        </SidebarMenu>
      </SidebarProvider>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const ActionNeeded: Story = {
  args: {
    name: 'Auth Module',
    status: 'action-needed',
  },
};

export const InProgress: Story = {
  args: {
    name: 'Payment Integration',
    status: 'in-progress',
    startedAt: Date.now() - 330_000,
  },
};

export const Done: Story = {
  args: {
    name: 'User Dashboard',
    status: 'done',
    duration: '2h',
  },
};

export const WithClickHandler: Story = {
  args: {
    name: 'API Gateway',
    status: 'action-needed',
    onClick: () => alert('Clicked!'),
  },
};
