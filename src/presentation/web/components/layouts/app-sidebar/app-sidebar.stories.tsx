import type { Meta, StoryObj } from '@storybook/react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from './app-sidebar';

const meta: Meta<typeof AppSidebar> = {
  title: 'Layout/AppSidebar',
  component: AppSidebar,
  parameters: {
    layout: 'fullscreen',
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

const mockFeatures = [
  { name: 'Auth Module', status: 'action-needed' as const },
  { name: 'Payment Flow', status: 'action-needed' as const },
  { name: 'Dashboard', status: 'in-progress' as const, startedAt: Date.now() - 330_000 },
  { name: 'API Gateway', status: 'in-progress' as const, startedAt: Date.now() - 60_000 },
  { name: 'Settings Page', status: 'done' as const, duration: '2h' },
  { name: 'User Profile', status: 'done' as const, duration: '1h' },
];

export const Default: Story = {
  args: {
    features: mockFeatures,
  },
};

export const Empty: Story = {
  args: {
    features: [],
  },
};

export const AllInProgress: Story = {
  args: {
    features: [
      { name: 'Feature A', status: 'in-progress' as const, startedAt: Date.now() - 120_000 },
      { name: 'Feature B', status: 'in-progress' as const, startedAt: Date.now() - 600_000 },
    ],
  },
};

export const AllDone: Story = {
  args: {
    features: [
      { name: 'Feature A', status: 'done' as const, duration: '30m' },
      { name: 'Feature B', status: 'done' as const, duration: '1h' },
      { name: 'Feature C', status: 'done' as const, duration: '3h' },
    ],
  },
};
