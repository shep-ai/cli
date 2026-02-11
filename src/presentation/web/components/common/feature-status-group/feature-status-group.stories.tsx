import type { Meta, StoryObj } from '@storybook/react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { FeatureListItem } from '@/components/common/feature-list-item';
import { FeatureStatusGroup } from './feature-status-group';

const meta: Meta<typeof FeatureStatusGroup> = {
  title: 'Composed/FeatureStatusGroup',
  component: FeatureStatusGroup,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <SidebarProvider>
        <div className="w-64">
          <Story />
        </div>
      </SidebarProvider>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const InProgress: Story = {
  args: {
    label: 'In Progress',
    count: 2,
    children: (
      <>
        <FeatureListItem name="Dashboard" status="in-progress" startedAt={Date.now() - 330_000} />
        <FeatureListItem name="API Gateway" status="in-progress" startedAt={Date.now() - 60_000} />
      </>
    ),
  },
};

export const Done: Story = {
  args: {
    label: 'Done',
    count: 3,
    children: (
      <>
        <FeatureListItem name="Settings Page" status="done" duration="2h" />
        <FeatureListItem name="User Profile" status="done" duration="1h" />
        <FeatureListItem name="Auth Module" status="done" duration="30m" />
      </>
    ),
  },
};

export const ActionNeeded: Story = {
  args: {
    label: 'Action Needed',
    count: 2,
    children: (
      <>
        <FeatureListItem name="Auth Module" status="action-needed" />
        <FeatureListItem name="Payment Flow" status="action-needed" />
      </>
    ),
  },
};
