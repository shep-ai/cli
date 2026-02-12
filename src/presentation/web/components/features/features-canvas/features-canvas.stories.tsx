import type { Meta, StoryObj } from '@storybook/react';
import type { Edge } from '@xyflow/react';
import { FeaturesCanvas } from './features-canvas';
import type { CanvasNodeType } from './features-canvas';
import type { FeatureNodeType } from '@/components/common/feature-node';
import type { RepositoryNodeType } from '@/components/common/repository-node';
import type { AddRepositoryNodeType } from '@/components/common/add-repository-node';

const meta: Meta<typeof FeaturesCanvas> = {
  title: 'Features/FeaturesCanvas',
  component: FeaturesCanvas,
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

const repoNode: RepositoryNodeType = {
  id: 'repo-1',
  type: 'repositoryNode',
  position: { x: 50, y: 162 },
  data: {
    name: 'shep-ai/cli',
  },
};

const addRepoNode: AddRepositoryNodeType = {
  id: 'add-repo',
  type: 'addRepositoryNode',
  position: { x: 50, y: 302 },
  data: {},
};

const repoFeatureNodes: CanvasNodeType[] = [
  repoNode,
  addRepoNode,
  {
    id: 'feat-1',
    type: 'featureNode',
    position: { x: 400, y: 0 },
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
    id: 'feat-2',
    type: 'featureNode',
    position: { x: 400, y: 230 },
    data: {
      name: 'Feature Flow Canvas',
      description: 'React Flow canvas for features',
      featureId: '#f2',
      lifecycle: 'requirements',
      state: 'action-required',
      progress: 20,
    },
  },
];

const dashedEdge = { style: { strokeDasharray: '5 5' } };

const repoFeatureEdges: Edge[] = [
  { id: 'e-repo-f1', source: 'repo-1', target: 'feat-1', ...dashedEdge },
  { id: 'e-repo-f2', source: 'repo-1', target: 'feat-2', ...dashedEdge },
];

export const ConnectedRepositoryMultipleFeatures: Story = {
  args: {
    nodes: repoFeatureNodes,
    edges: repoFeatureEdges,
    onNodeAction: () => undefined,
    onNodeSettings: () => undefined,
  },
};

// --- Story 1: Single repository connected to a single feature ---

const singleRepoSingleFeatureNodes: CanvasNodeType[] = [
  {
    id: 'repo-1',
    type: 'repositoryNode',
    position: { x: 50, y: 127 },
    data: { name: 'shep-ai/cli' },
  },
  {
    id: 'add-repo',
    type: 'addRepositoryNode',
    position: { x: 50, y: 267 },
    data: {},
  },
  {
    id: 'feat-1',
    type: 'featureNode',
    position: { x: 400, y: 80 },
    data: {
      name: 'Auth Module',
      description: 'OAuth2 authentication flow',
      featureId: '#f1',
      lifecycle: 'implementation',
      state: 'running',
      progress: 65,
    },
  },
];

export const ConnectedRepositorySingleFeature: Story = {
  args: {
    nodes: singleRepoSingleFeatureNodes,
    edges: [
      { id: 'e-repo-f1', source: 'repo-1', target: 'feat-1', type: 'straight', ...dashedEdge },
    ],
    onNodeAction: () => undefined,
    onNodeSettings: () => undefined,
  },
};

// --- Story 2: Multiple repositories connected to one shared feature ---

const multiRepoSingleFeatureNodes: CanvasNodeType[] = [
  {
    id: 'repo-1',
    type: 'repositoryNode',
    position: { x: 50, y: 30 },
    data: { name: 'shep-ai/cli' },
  },
  {
    id: 'repo-2',
    type: 'repositoryNode',
    position: { x: 50, y: 170 },
    data: { name: 'shep-ai/web' },
  },
  {
    id: 'repo-3',
    type: 'repositoryNode',
    position: { x: 50, y: 310 },
    data: { name: 'shep-ai/api' },
  },
  {
    id: 'add-repo',
    type: 'addRepositoryNode',
    position: { x: 50, y: 450 },
    data: {},
  },
  {
    id: 'feat-1',
    type: 'featureNode',
    position: { x: 450, y: 130 },
    data: {
      name: 'SSO Integration',
      description: 'Single sign-on across all services',
      featureId: '#f1',
      lifecycle: 'implementation',
      state: 'running',
      progress: 40,
    },
  },
];

export const MultipleRepositoriesSingleFeature: Story = {
  args: {
    nodes: multiRepoSingleFeatureNodes,
    edges: [
      { id: 'e-r1-f1', source: 'repo-1', target: 'feat-1', ...dashedEdge },
      { id: 'e-r2-f1', source: 'repo-2', target: 'feat-1', ...dashedEdge },
      { id: 'e-r3-f1', source: 'repo-3', target: 'feat-1', ...dashedEdge },
    ],
    onNodeAction: () => undefined,
    onNodeSettings: () => undefined,
  },
};

// --- Story 3: Multiple repositories each with their own features ---

const multiRepoNodes: CanvasNodeType[] = [
  {
    id: 'repo-1',
    type: 'repositoryNode',
    position: { x: 50, y: 60 },
    data: { name: 'shep-ai/cli' },
  },
  {
    id: 'repo-2',
    type: 'repositoryNode',
    position: { x: 50, y: 310 },
    data: { name: 'shep-ai/web' },
  },
  {
    id: 'add-repo',
    type: 'addRepositoryNode',
    position: { x: 50, y: 470 },
    data: {},
  },
  {
    id: 'feat-1',
    type: 'featureNode',
    position: { x: 400, y: 40 },
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
    id: 'feat-2',
    type: 'featureNode',
    position: { x: 400, y: 290 },
    data: {
      name: 'Dashboard UI',
      description: 'Main dashboard layout and widgets',
      featureId: '#f2',
      lifecycle: 'requirements',
      state: 'action-required',
      progress: 15,
    },
  },
];

export const MultipleRepositories: Story = {
  args: {
    nodes: multiRepoNodes,
    edges: [
      { id: 'e-r1-f1', source: 'repo-1', target: 'feat-1', ...dashedEdge },
      { id: 'e-r2-f2', source: 'repo-2', target: 'feat-2', ...dashedEdge },
    ],
    onNodeAction: () => undefined,
    onNodeSettings: () => undefined,
  },
};

// --- Story 4: Multiple repositories with mixed feature connections ---

const mixedRepoFeatureNodes: CanvasNodeType[] = [
  {
    id: 'repo-1',
    type: 'repositoryNode',
    position: { x: 50, y: 30 },
    data: { name: 'shep-ai/cli' },
  },
  {
    id: 'repo-2',
    type: 'repositoryNode',
    position: { x: 50, y: 200 },
    data: { name: 'shep-ai/web' },
  },
  {
    id: 'repo-3',
    type: 'repositoryNode',
    position: { x: 50, y: 370 },
    data: { name: 'shep-ai/api' },
  },
  {
    id: 'add-repo',
    type: 'addRepositoryNode',
    position: { x: 50, y: 510 },
    data: {},
  },
  {
    id: 'feat-1',
    type: 'featureNode',
    position: { x: 420, y: 0 },
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
    id: 'feat-2',
    type: 'featureNode',
    position: { x: 420, y: 170 },
    data: {
      name: 'SSO Integration',
      description: 'Single sign-on across services',
      featureId: '#f2',
      lifecycle: 'plan',
      state: 'action-required',
      progress: 20,
    },
  },
  {
    id: 'feat-3',
    type: 'featureNode',
    position: { x: 420, y: 340 },
    data: {
      name: 'API Gateway',
      description: 'Rate limiting and routing',
      featureId: '#f3',
      lifecycle: 'requirements',
      state: 'running',
      progress: 10,
    },
  },
  {
    id: 'feat-4',
    type: 'featureNode',
    position: { x: 820, y: 80 },
    data: {
      name: 'Admin Panel',
      description: 'Internal admin tools',
      featureId: '#f4',
      lifecycle: 'deploy',
      state: 'done',
      progress: 100,
    },
  },
];

export const MultipleRepositoriesMixedConnections: Story = {
  args: {
    nodes: mixedRepoFeatureNodes,
    edges: [
      // repo-1 (cli) → Auth Module only
      { id: 'e-r1-f1', source: 'repo-1', target: 'feat-1', ...dashedEdge },
      // repo-2 (web) → Auth Module, SSO, and Admin Panel (multiple features)
      { id: 'e-r2-f1', source: 'repo-2', target: 'feat-1', ...dashedEdge },
      { id: 'e-r2-f2', source: 'repo-2', target: 'feat-2', ...dashedEdge },
      { id: 'e-r2-f4', source: 'repo-2', target: 'feat-4', ...dashedEdge },
      // repo-3 (api) → SSO and API Gateway (multiple features)
      { id: 'e-r3-f2', source: 'repo-3', target: 'feat-2', ...dashedEdge },
      { id: 'e-r3-f3', source: 'repo-3', target: 'feat-3', ...dashedEdge },
    ],
    onNodeAction: () => undefined,
    onNodeSettings: () => undefined,
  },
};
