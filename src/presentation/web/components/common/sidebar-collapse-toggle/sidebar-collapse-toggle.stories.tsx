import type { Meta, StoryObj } from '@storybook/react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { SidebarCollapseToggle } from './sidebar-collapse-toggle';

const meta: Meta<typeof SidebarCollapseToggle> = {
  title: 'Composed/SidebarCollapseToggle',
  component: SidebarCollapseToggle,
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

export const Expanded: Story = {};

export const Collapsed: Story = {
  decorators: [
    (Story) => (
      <SidebarProvider defaultOpen={false}>
        <Story />
      </SidebarProvider>
    ),
  ],
};
