import type { Meta, StoryObj } from '@storybook/react';
import type { Edge } from '@xyflow/react';
import { FeatureFlowCanvas } from './feature-flow-canvas';
import type { FeatureNodeType } from '@/components/common/feature-node';

const meta: Meta<typeof FeatureFlowCanvas> = {
  title: 'Features/FeatureFlowCanvas',
  component: FeatureFlowCanvas,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
  },
  decorators: [
    (Story) => (
      <div style={{ height: '100vh' }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof meta>;

const singleNode: FeatureNodeType = {
  id: 'node-1',
  type: 'featureNode',
  position: { x: 200, y: 150 },
  data: {
    name: 'Auth Module',
    description: 'Implement OAuth2 authentication flow',
    featureId: '#f1',
    lifecycle: 'requirements',
    state: 'running',
    progress: 45,
  },
};

const multipleNodes: FeatureNodeType[] = [
  {
    id: 'node-1',
    type: 'featureNode',
    position: { x: 50, y: 50 },
    data: {
      name: 'Auth Module',
      description: 'OAuth2 authentication flow',
      featureId: '#f1',
      lifecycle: 'implementation',
      state: 'running',
      progress: 65,
    },
  },
  {
    id: 'node-2',
    type: 'featureNode',
    position: { x: 450, y: 50 },
    data: {
      name: 'User Dashboard',
      description: 'Main user dashboard view',
      featureId: '#f2',
      lifecycle: 'plan',
      state: 'action-required',
      progress: 20,
    },
  },
  {
    id: 'node-3',
    type: 'featureNode',
    position: { x: 50, y: 280 },
    data: {
      name: 'API Gateway',
      description: 'Rate limiting and routing',
      featureId: '#f3',
      lifecycle: 'deploy',
      state: 'done',
      progress: 100,
    },
  },
  {
    id: 'node-4',
    type: 'featureNode',
    position: { x: 450, y: 280 },
    data: {
      name: 'Payment Integration',
      description: 'Stripe payment processing',
      featureId: '#f4',
      lifecycle: 'test',
      state: 'blocked',
      progress: 40,
    },
  },
  {
    id: 'node-5',
    type: 'featureNode',
    position: { x: 850, y: 165 },
    data: {
      name: 'Email Service',
      description: 'Transactional email delivery',
      featureId: '#f5',
      lifecycle: 'implementation',
      state: 'error',
      progress: 30,
    },
  },
];

const connectedNodes: FeatureNodeType[] = [
  {
    id: 'node-1',
    type: 'featureNode',
    position: { x: 50, y: 120 },
    data: {
      name: 'Auth Module',
      description: 'OAuth2 authentication',
      featureId: '#f1',
      lifecycle: 'implementation',
      state: 'running',
      progress: 65,
    },
  },
  {
    id: 'node-2',
    type: 'featureNode',
    position: { x: 450, y: 0 },
    data: {
      name: 'User Dashboard',
      description: 'Depends on auth module',
      featureId: '#f2',
      lifecycle: 'plan',
      state: 'blocked',
      progress: 10,
      blockedBy: 'Auth Module',
    },
  },
  {
    id: 'node-3',
    type: 'featureNode',
    position: { x: 450, y: 240 },
    data: {
      name: 'API Gateway',
      description: 'Depends on auth module',
      featureId: '#f3',
      lifecycle: 'requirements',
      state: 'action-required',
      progress: 5,
    },
  },
  {
    id: 'node-4',
    type: 'featureNode',
    position: { x: 850, y: 120 },
    data: {
      name: 'Admin Panel',
      description: 'Depends on dashboard and API',
      featureId: '#f4',
      lifecycle: 'requirements',
      state: 'blocked',
      progress: 0,
      blockedBy: 'User Dashboard',
    },
  },
];

const connectedEdges: Edge[] = [
  { id: 'e1-2', source: 'node-1', target: 'node-2' },
  { id: 'e1-3', source: 'node-1', target: 'node-3' },
  { id: 'e2-4', source: 'node-2', target: 'node-4' },
  { id: 'e3-4', source: 'node-3', target: 'node-4' },
];

export const Empty: Story = {
  args: {
    nodes: [],
    edges: [],
    onAddFeature: () => undefined,
  },
};

export const SingleNode: Story = {
  args: {
    nodes: [singleNode],
    edges: [],
  },
};

export const MultipleNodes: Story = {
  args: {
    nodes: multipleNodes,
    edges: [],
  },
};

export const ConnectedNodes: Story = {
  args: {
    nodes: connectedNodes,
    edges: connectedEdges,
  },
};

export const Interactive: Story = {
  args: {
    nodes: multipleNodes,
    edges: [
      { id: 'e1-2', source: 'node-1', target: 'node-2' },
      { id: 'e3-4', source: 'node-3', target: 'node-4' },
    ],
    onAddFeature: () => undefined,
    onNodeAction: () => undefined,
    onNodeSettings: () => undefined,
  },
};
