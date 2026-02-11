import type { Meta, StoryObj } from '@storybook/react';
import { SidebarProvider } from '@/components/ui/sidebar';
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
        <Story />
      </SidebarProvider>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const WithChildren: Story = {
  args: {
    label: 'In Progress',
    count: 3,
    children: (
      <ul>
        <li>Feature A</li>
        <li>Feature B</li>
        <li>Feature C</li>
      </ul>
    ),
  },
};

export const EmptyGroup: Story = {
  args: {
    label: 'Done',
    count: 0,
    children: <p>No features yet</p>,
  },
};

export const HighCount: Story = {
  args: {
    label: 'Action Needed',
    count: 12,
    children: (
      <ul>
        <li>Feature X</li>
        <li>Feature Y</li>
      </ul>
    ),
  },
};
