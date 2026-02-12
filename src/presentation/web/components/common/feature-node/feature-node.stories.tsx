import type { Meta, StoryObj } from '@storybook/react';
import { ReactFlowProvider, ReactFlow } from '@xyflow/react';
import { FeatureNode } from './feature-node';
import type {
  FeatureNodeData,
  FeatureNodeState,
  FeatureLifecyclePhase,
} from './feature-node-state-config';

const meta: Meta<FeatureNodeData> = {
  title: 'Composed/FeatureNode',
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  args: {
    name: 'Auth Module',
    description: 'Implement OAuth2 authentication flow',
    featureId: '#f1',
    lifecycle: 'requirements',
    state: 'running',
    progress: 45,
  },
  decorators: [
    (Story) => (
      <ReactFlowProvider>
        <ReactFlow
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={false}
          style={{ width: 300, height: 200 }}
        >
          <Story />
        </ReactFlow>
      </ReactFlowProvider>
    ),
  ],
};

export default meta;
type Story = StoryObj<FeatureNodeData>;

export const Default: Story = {
  render: (args) => <FeatureNode id="node-default" data={args} type="featureNode" />,
};

const allStates: FeatureNodeState[] = ['running', 'action-required', 'done', 'blocked', 'error'];

export const AllStates: Story = {
  decorators: [],
  render: () => (
    <div className="flex flex-wrap gap-6">
      {allStates.map((state, i) => (
        <ReactFlowProvider key={state}>
          <ReactFlow
            nodesDraggable={false}
            nodesConnectable={false}
            elementsSelectable={false}
            style={{ width: 260, height: 160 }}
          >
            <FeatureNode
              id={`node-${state}`}
              data={{
                name: 'Feature Name',
                description: `This feature is ${state}`,
                featureId: `#f${i + 1}`,
                lifecycle: 'implementation' as FeatureLifecyclePhase,
                state,
                progress: [45, 60, 100, 20, 30][i],
              }}
              type="featureNode"
            />
          </ReactFlow>
        </ReactFlowProvider>
      ))}
    </div>
  ),
};

const allLifecycles: FeatureLifecyclePhase[] = [
  'requirements',
  'plan',
  'implementation',
  'test',
  'deploy',
  'maintenance',
];

export const AllLifecycles: Story = {
  decorators: [],
  render: () => (
    <div className="flex flex-wrap gap-6">
      {allLifecycles.map((lifecycle, i) => (
        <ReactFlowProvider key={lifecycle}>
          <ReactFlow
            nodesDraggable={false}
            nodesConnectable={false}
            elementsSelectable={false}
            style={{ width: 260, height: 160 }}
          >
            <FeatureNode
              id={`node-${lifecycle}`}
              data={{
                name: 'Feature Name',
                description: `Currently in ${lifecycle} phase`,
                featureId: `#f${i + 1}`,
                lifecycle,
                state: 'running' as FeatureNodeState,
                progress: [10, 25, 50, 70, 90, 100][i],
              }}
              type="featureNode"
            />
          </ReactFlow>
        </ReactFlowProvider>
      ))}
    </div>
  ),
};

export const WithAction: Story = {
  args: {
    onAction: () => undefined,
    onSettings: () => undefined,
  },
  render: (args) => <FeatureNode id="node-action" data={args} type="featureNode" />,
};

export const LongContent: Story = {
  args: {
    name: 'Enterprise Authentication Module With SSO Integration',
    description:
      'Implement a comprehensive OAuth2 authentication flow with support for multiple identity providers including Google, GitHub, and custom SAML-based enterprise SSO',
  },
  render: (args) => <FeatureNode id="node-long" data={args} type="featureNode" />,
};
