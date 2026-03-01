import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import type { FeatureNodeData } from '@/components/common/feature-node';
import { BoardRow } from './board-row';

function createFeatureData(overrides: Partial<FeatureNodeData> = {}): FeatureNodeData {
  return {
    name: 'Authentication Module',
    description: 'Add OAuth2 login flow',
    featureId: 'feat-abc123',
    lifecycle: 'implementation',
    state: 'running',
    progress: 45,
    repositoryPath: '/repos/my-app',
    branch: 'feat/auth',
    agentType: 'claude-code',
    onDelete: fn(),
    ...overrides,
  };
}

const meta: Meta<typeof BoardRow> = {
  title: 'Features/BoardView/BoardRow',
  component: BoardRow,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 400, padding: 8 }}>
        <Story />
      </div>
    ),
  ],
  args: {
    onSelect: fn(),
    onDetails: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Running: Story = {
  args: { data: createFeatureData({ state: 'running', agentType: 'claude-code' }) },
};

export const Creating: Story = {
  args: { data: createFeatureData({ state: 'creating', name: 'New Feature', progress: 0 }) },
};

export const ActionRequired: Story = {
  args: {
    data: createFeatureData({
      state: 'action-required',
      lifecycle: 'review',
      name: 'Payment Gateway',
    }),
  },
};

export const Done: Story = {
  args: {
    data: createFeatureData({
      state: 'done',
      lifecycle: 'maintain',
      progress: 100,
      runtime: '2h 15m',
    }),
  },
};

export const Blocked: Story = {
  args: {
    data: createFeatureData({
      state: 'blocked',
      blockedBy: 'Database Migration',
      name: 'User Dashboard',
    }),
  },
};

export const Error: Story = {
  args: {
    data: createFeatureData({
      state: 'error',
      errorMessage: 'Agent process crashed',
      name: 'Email Service',
    }),
  },
};

export const Selected: Story = {
  args: {
    data: createFeatureData(),
    isSelected: true,
  },
};

export const WithPR: Story = {
  args: {
    data: createFeatureData({
      state: 'action-required',
      lifecycle: 'review',
      pr: { url: 'https://github.com/org/repo/pull/42', number: 42, status: 'Open' as never },
    }),
  },
};

export const WithoutActions: Story = {
  args: {
    data: createFeatureData({ onDelete: undefined }),
    onDetails: undefined,
  },
};

export const LongName: Story = {
  args: {
    data: createFeatureData({
      name: 'A Very Long Feature Name That Should Be Truncated When It Exceeds Available Space',
    }),
  },
};
