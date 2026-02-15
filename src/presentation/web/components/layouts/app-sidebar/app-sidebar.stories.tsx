import type { Meta, StoryObj } from '@storybook/react';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from './app-sidebar';

interface DecoratorContext {
  parameters?: { sidebar?: { defaultOpen?: boolean } };
}

const meta: Meta<typeof AppSidebar> = {
  title: 'Layout/AppSidebar',
  component: AppSidebar,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
  decorators: [
    (Story, context: DecoratorContext) => {
      const defaultOpen = context.parameters?.sidebar?.defaultOpen ?? true;
      return (
        <SidebarProvider defaultOpen={defaultOpen}>
          <Story />
          <SidebarInset aria-label="Main content">
            <div className="flex items-center gap-2 border-b px-4 py-2">
              <span className="text-sm text-muted-foreground">Content area</span>
            </div>
          </SidebarInset>
        </SidebarProvider>
      );
    },
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

export const Collapsed: Story = {
  args: {
    features: mockFeatures,
  },
  parameters: {
    sidebar: { defaultOpen: false },
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
