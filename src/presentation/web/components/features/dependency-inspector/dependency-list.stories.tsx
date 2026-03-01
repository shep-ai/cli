import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import type { FeatureNodeData } from '@/components/common/feature-node';
import { DependencyList } from './dependency-list';

function createFeature(
  id: string,
  name: string,
  overrides: Partial<FeatureNodeData> = {}
): FeatureNodeData {
  return {
    name,
    featureId: id,
    lifecycle: 'implementation',
    state: 'running',
    progress: 40,
    repositoryPath: '/repos/my-app',
    branch: `feat/${id}`,
    ...overrides,
  };
}

const meta: Meta<typeof DependencyList> = {
  title: 'Features/DependencyInspector/DependencyList',
  component: DependencyList,
  tags: ['autodocs'],
  args: {
    onSelect: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const UpstreamEmpty: Story = {
  args: {
    direction: 'upstream',
    items: [],
  },
};

export const DownstreamEmpty: Story = {
  args: {
    direction: 'downstream',
    items: [],
  },
};

export const UpstreamSingle: Story = {
  args: {
    direction: 'upstream',
    items: [createFeature('f1', 'Authentication Module', { state: 'done' })],
  },
};

export const DownstreamMultiple: Story = {
  args: {
    direction: 'downstream',
    items: [
      createFeature('f1', 'Dashboard Charts', { state: 'blocked', blockedBy: 'Payment Gateway' }),
      createFeature('f2', 'Notification System', { state: 'running' }),
      createFeature('f3', 'Email Service', { state: 'action-required' }),
    ],
  },
};

export const MixedStates: Story = {
  args: {
    direction: 'upstream',
    items: [
      createFeature('f1', 'API Gateway', { state: 'done' }),
      createFeature('f2', 'Database Migration', {
        state: 'error',
        errorMessage: 'Schema conflict',
      }),
      createFeature('f3', 'Auth Service', { state: 'running' }),
    ],
  },
};
