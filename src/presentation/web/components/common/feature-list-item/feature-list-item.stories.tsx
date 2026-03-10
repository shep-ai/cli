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
    agentType: 'claude-code',
    modelId: 'claude-sonnet-4-6',
  },
};

export const InProgress: Story = {
  args: {
    name: 'Payment Integration',
    status: 'in-progress',
    startedAt: Date.now() - 330_000,
    agentType: 'cursor',
    modelId: 'claude-opus-4-6',
  },
};

export const Done: Story = {
  args: {
    name: 'User Dashboard',
    status: 'done',
    duration: '2h',
    agentType: 'gemini-cli',
    modelId: 'gemini-2.5-pro',
  },
};

export const Blocked: Story = {
  args: {
    name: 'Dependency Resolver',
    status: 'blocked',
    agentType: 'claude-code',
    modelId: 'claude-sonnet-4-6',
  },
};

export const Error: Story = {
  args: {
    name: 'Broken Pipeline',
    status: 'error',
    agentType: 'cursor',
    modelId: 'claude-opus-4-6',
  },
};

export const WithClickHandler: Story = {
  args: {
    name: 'API Gateway',
    status: 'action-needed',
    agentType: 'dev',
    modelId: 'gpt-8',
    onClick: () => alert('Clicked!'),
  },
};

export const WithoutAgent: Story = {
  args: {
    name: 'Legacy Feature',
    status: 'in-progress',
    startedAt: Date.now() - 60_000,
  },
};
