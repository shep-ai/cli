import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import type { FeatureNodeData, FeatureNodeState } from '@/components/common/feature-node';
import { BoardColumn } from './board-column';

function createFeature(index: number, overrides: Partial<FeatureNodeData> = {}): FeatureNodeData {
  const states: FeatureNodeState[] = ['running', 'action-required', 'done', 'blocked', 'error'];
  return {
    name: `Feature ${index}`,
    description: `Description for feature ${index}`,
    featureId: `feat-${index}`,
    lifecycle: 'implementation',
    state: states[index % states.length],
    progress: (index * 20) % 100,
    repositoryPath: '/repos/my-app',
    branch: `feat/feature-${index}`,
    onDelete: fn(),
    ...overrides,
  };
}

const meta: Meta<typeof BoardColumn> = {
  title: 'Features/BoardView/BoardColumn',
  component: BoardColumn,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div style={{ height: 600, width: 300 }}>
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

export const Empty: Story = {
  args: {
    label: 'Done',
    columnId: 'done',
    features: [],
  },
};

export const SmallColumn: Story = {
  args: {
    label: 'Review',
    columnId: 'review',
    features: Array.from({ length: 5 }, (_, i) => createFeature(i)),
  },
};

export const MediumColumn: Story = {
  args: {
    label: 'Implementation',
    columnId: 'implementation',
    features: Array.from({ length: 15 }, (_, i) => createFeature(i)),
  },
};

export const LargeColumn: Story = {
  args: {
    label: 'Backlog',
    columnId: 'backlog',
    features: Array.from({ length: 100 }, (_, i) =>
      createFeature(i, { state: 'running', agentType: 'claude-code' })
    ),
  },
};

export const WithSelection: Story = {
  args: {
    label: 'Requirements',
    columnId: 'requirements',
    features: Array.from({ length: 8 }, (_, i) => createFeature(i)),
    selectedFeatureId: 'feat-3',
  },
};
