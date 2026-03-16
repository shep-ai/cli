import type { Meta, StoryObj } from '@storybook/react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { FeatureStatusBadges } from './feature-status-badges';

const meta: Meta<typeof FeatureStatusBadges> = {
  title: 'Composed/FeatureStatusBadges',
  component: FeatureStatusBadges,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <SidebarProvider defaultOpen={false}>
        <div className="bg-sidebar flex w-12 justify-center rounded-md p-2">
          <Story />
        </div>
      </SidebarProvider>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const AllStatuses: Story = {
  args: {
    counts: { 'action-needed': 2, 'in-progress': 3, pending: 2, blocked: 1, error: 1, done: 5 },
  },
};

export const ActionNeededOnly: Story = {
  args: {
    counts: { 'action-needed': 4, 'in-progress': 0, pending: 0, blocked: 0, error: 0, done: 0 },
  },
};

export const InProgressOnly: Story = {
  args: {
    counts: { 'action-needed': 0, 'in-progress': 2, pending: 0, blocked: 0, error: 0, done: 0 },
  },
};

export const DoneOnly: Story = {
  args: {
    counts: { 'action-needed': 0, 'in-progress': 0, pending: 0, blocked: 0, error: 0, done: 7 },
  },
};

export const LargeCounts: Story = {
  args: {
    counts: { 'action-needed': 12, 'in-progress': 99, pending: 8, blocked: 5, error: 3, done: 150 },
  },
};

export const Empty: Story = {
  args: {
    counts: { 'action-needed': 0, 'in-progress': 0, pending: 0, blocked: 0, error: 0, done: 0 },
  },
};
