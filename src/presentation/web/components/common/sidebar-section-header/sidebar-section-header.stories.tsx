import type { Meta, StoryObj } from '@storybook/react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { SidebarSectionHeader } from './sidebar-section-header';

const meta: Meta<typeof SidebarSectionHeader> = {
  title: 'Composed/SidebarSectionHeader',
  component: SidebarSectionHeader,
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

export const Default: Story = {
  args: {
    label: 'Features',
  },
};

export const WithActions: Story = {
  args: {
    label: 'Features',
    onFolderClick: () => console.log('Folder clicked'),
    onMenuClick: () => console.log('Menu clicked'),
  },
};
