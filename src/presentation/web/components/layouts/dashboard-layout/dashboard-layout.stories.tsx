import type { Meta, StoryObj } from '@storybook/react';
import { DashboardLayout } from './dashboard-layout';

const meta: Meta<typeof DashboardLayout> = {
  title: 'Layout/DashboardLayout',
  component: DashboardLayout,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

const sidebarItems = [
  { label: 'Dashboard', href: '/dashboard' },
  { label: 'Features', href: '/features' },
  { label: 'Settings', href: '/settings' },
];

export const Default: Story = {
  args: {
    sidebarItems,
    pathname: '/dashboard',
    title: 'Dashboard',
    children: <p className="text-muted-foreground">Select a feature to get started.</p>,
  },
};

export const WithContent: Story = {
  args: {
    sidebarItems,
    pathname: '/features',
    title: 'Features',
    children: (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-lg border p-4">
          <h3 className="font-semibold">Auth Module</h3>
          <p className="text-muted-foreground text-sm">User authentication and authorization</p>
        </div>
        <div className="rounded-lg border p-4">
          <h3 className="font-semibold">Dashboard</h3>
          <p className="text-muted-foreground text-sm">Analytics and reporting</p>
        </div>
        <div className="rounded-lg border p-4">
          <h3 className="font-semibold">API Gateway</h3>
          <p className="text-muted-foreground text-sm">Request routing and rate limiting</p>
        </div>
      </div>
    ),
  },
};

export const WithActions: Story = {
  args: {
    sidebarItems,
    pathname: '/features',
    title: 'Features',
    actions: (
      <button className="bg-primary text-primary-foreground rounded-md px-4 py-2 text-sm">
        New Feature
      </button>
    ),
    children: <p className="text-muted-foreground">No features yet. Create one to get started.</p>,
  },
};
