import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import type { FeatureNodeData } from '@/components/common/feature-node';
import { DependencyInspector } from './dependency-inspector';

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

const meta: Meta<typeof DependencyInspector> = {
  title: 'Features/DependencyInspector/DependencyInspector',
  component: DependencyInspector,
  tags: ['autodocs'],
  parameters: { layout: 'fullscreen' },
  decorators: [
    (Story) => (
      <div style={{ height: '100vh', display: 'flex', justifyContent: 'flex-end' }}>
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

export const NoSelection: Story = {
  args: {
    selectedFeature: null,
    allFeatures: [],
    parentIdMap: {},
  },
};

const loneFeature = createFeature('f1', 'Standalone Feature', { state: 'running' });

export const NoDependencies: Story = {
  args: {
    selectedFeature: loneFeature,
    allFeatures: [loneFeature],
    parentIdMap: {},
  },
};

const parent = createFeature('p1', 'Auth Service', { state: 'done', lifecycle: 'maintain' });
const selected = createFeature('f1', 'User Dashboard', { state: 'running' });
const child1 = createFeature('c1', 'Dashboard Charts', {
  state: 'blocked',
  blockedBy: 'User Dashboard',
});
const child2 = createFeature('c2', 'Notification Center', { state: 'running' });

export const WithDependencies: Story = {
  args: {
    selectedFeature: selected,
    allFeatures: [parent, selected, child1, child2],
    parentIdMap: { f1: 'p1', c1: 'f1', c2: 'f1' },
  },
};

export const UpstreamOnly: Story = {
  args: {
    selectedFeature: selected,
    allFeatures: [parent, selected],
    parentIdMap: { f1: 'p1' },
  },
};

export const DownstreamOnly: Story = {
  args: {
    selectedFeature: selected,
    allFeatures: [selected, child1, child2],
    parentIdMap: { c1: 'f1', c2: 'f1' },
  },
};
