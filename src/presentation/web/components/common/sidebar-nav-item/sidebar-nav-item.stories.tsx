import type { Meta, StoryObj } from '@storybook/react';
import { Home, Brain, Settings, LayoutDashboard } from 'lucide-react';
import { SidebarProvider, SidebarMenu } from '@/components/ui/sidebar';
import { SidebarNavItem } from './sidebar-nav-item';

const meta: Meta<typeof SidebarNavItem> = {
  title: 'Composed/SidebarNavItem',
  component: SidebarNavItem,
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

export const Default: Story = {
  args: {
    icon: Home,
    label: 'Control Center',
    href: '/',
  },
};

export const Active: Story = {
  args: {
    icon: Home,
    label: 'Control Center',
    href: '/',
    active: true,
  },
};

export const WithBrainIcon: Story = {
  args: {
    icon: Brain,
    label: 'Memory',
    href: '/memory',
  },
};

export const WithSettingsIcon: Story = {
  args: {
    icon: Settings,
    label: 'Settings',
    href: '/settings',
  },
};

export const WithDashboardIcon: Story = {
  args: {
    icon: LayoutDashboard,
    label: 'Dashboard',
    href: '/dashboard',
    active: true,
  },
};
