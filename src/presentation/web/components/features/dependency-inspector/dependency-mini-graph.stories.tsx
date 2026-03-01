import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import type { FeatureNodeData } from '@/components/common/feature-node';
import { DependencyMiniGraph } from './dependency-mini-graph';

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

const meta: Meta<typeof DependencyMiniGraph> = {
  title: 'Features/DependencyInspector/DependencyMiniGraph',
  component: DependencyMiniGraph,
  tags: ['autodocs'],
  parameters: { layout: 'padded' },
  decorators: [
    (Story) => (
      <div style={{ width: 320 }}>
        <Story />
      </div>
    ),
  ],
  args: {
    onFeatureSelect: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

const loneFeature = createFeature('f1', 'Standalone Feature', { state: 'running' });

export const SingleNode: Story = {
  args: {
    selectedFeature: loneFeature,
    allFeatures: [loneFeature],
    parentIdMap: {},
  },
};

const parent = createFeature('p1', 'Auth Service', { state: 'done' });
const selected = createFeature('f1', 'User Dashboard', { state: 'running' });

export const LinearChain: Story = {
  args: {
    selectedFeature: selected,
    allFeatures: [parent, selected],
    parentIdMap: { f1: 'p1' },
  },
};

const parentNode = createFeature('p1', 'Database Layer', { state: 'done' });
const selectedNode = createFeature('f1', 'API Gateway', { state: 'running' });
const child1 = createFeature('c1', 'Dashboard', { state: 'blocked', blockedBy: 'API Gateway' });
const child2 = createFeature('c2', 'Notification Service', { state: 'running' });
const child3 = createFeature('c3', 'Analytics', { state: 'action-required' });

export const BranchingDeps: Story = {
  args: {
    selectedFeature: selectedNode,
    allFeatures: [parentNode, selectedNode, child1, child2, child3],
    parentIdMap: { f1: 'p1', c1: 'f1', c2: 'f1', c3: 'f1' },
  },
};
