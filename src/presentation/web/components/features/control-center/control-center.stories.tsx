import type { Meta, StoryObj } from '@storybook/react';
import type { Edge } from '@xyflow/react';
import { ControlCenter } from './control-center';
import type { CanvasNodeType } from '@/components/features/features-canvas';
import type { FeatureNodeType } from '@/components/common/feature-node';
import type { RepositoryNodeType } from '@/components/common/repository-node';
import type { AddRepositoryNodeType } from '@/components/common/add-repository-node';
import { layoutWithDagre } from '@/lib/layout-with-dagre';

const meta: Meta<typeof ControlCenter> = {
  title: 'Features/ControlCenter',
  component: ControlCenter,
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

const featureNodes: FeatureNodeType[] = [
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
      name: 'User Dashboard',
      description: 'Main dashboard layout and widgets',
      featureId: '#f2',
      lifecycle: 'plan',
      state: 'action-required',
      progress: 20,
    },
  },
  {
    id: 'feat-3',
    type: 'featureNode',
    position: { x: 800, y: 115 },
    data: {
      name: 'API Gateway',
      description: 'Rate limiting and routing',
      featureId: '#f3',
      lifecycle: 'deploy',
      state: 'done',
      progress: 100,
    },
  },
];

const repoNode: RepositoryNodeType = {
  id: 'repo-1',
  type: 'repositoryNode',
  position: { x: 50, y: 115 },
  data: { name: 'shep-ai/cli' },
};

const addRepoNode: AddRepositoryNodeType = {
  id: 'add-repo',
  type: 'addRepositoryNode',
  position: { x: 50, y: 302 },
  data: {},
};

const dashedEdge = { style: { strokeDasharray: '5 5' } };

export const Empty: Story = {
  args: {
    initialNodes: [],
    initialEdges: [],
  },
};

export const WithFeatures: Story = {
  args: {
    initialNodes: featureNodes,
    initialEdges: [
      { id: 'e1-3', source: 'feat-1', target: 'feat-3' },
      { id: 'e2-3', source: 'feat-2', target: 'feat-3' },
    ],
  },
};

export const WithToolbar: Story = {
  args: {
    initialNodes: [featureNodes[0], featureNodes[1]],
    initialEdges: [],
  },
};

export const WithNodeActions: Story = {
  args: {
    initialNodes: [repoNode, addRepoNode, ...featureNodes] as CanvasNodeType[],
    initialEdges: [
      { id: 'e-repo-f1', source: 'repo-1', target: 'feat-1', ...dashedEdge },
      { id: 'e-repo-f2', source: 'repo-1', target: 'feat-2', ...dashedEdge },
      { id: 'e1-3', source: 'feat-1', target: 'feat-3' },
    ] as Edge[],
  },
};

/**
 * Interactive story — starts with just an "Add Repository" button.
 *
 * User flow:
 * 1. Click "Add Repository" → native folder picker → select a folder → repo node appears
 * 2. Hover the repo node → click (+) → a new feature node appears connected to the repo
 * 3. Hover the feature node → click (+) → another feature appears connected to the first
 *
 * You can also use the toolbar "Add Feature" button to create unconnected features.
 */
export const Interactive: Story = {
  args: {
    initialNodes: [
      {
        id: 'add-repo',
        type: 'addRepositoryNode',
        position: { x: 50, y: 50 },
        data: {},
      } as AddRepositoryNodeType,
    ] as CanvasNodeType[],
    initialEdges: [],
  },
};

// --- Dagre-layouted story: multiple repos with feature trees ---

const dagreRepoNodes: RepositoryNodeType[] = [
  {
    id: 'repo-cli',
    type: 'repositoryNode',
    position: { x: 0, y: 0 },
    data: { name: 'shep-ai/cli' },
  },
  {
    id: 'repo-web',
    type: 'repositoryNode',
    position: { x: 0, y: 0 },
    data: { name: 'shep-ai/web' },
  },
];

const dagreFeatureNodes: FeatureNodeType[] = [
  {
    id: 'feat-auth',
    type: 'featureNode',
    position: { x: 0, y: 0 },
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
    id: 'feat-sso',
    type: 'featureNode',
    position: { x: 0, y: 0 },
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
    id: 'feat-dashboard',
    type: 'featureNode',
    position: { x: 0, y: 0 },
    data: {
      name: 'User Dashboard',
      description: 'Main dashboard layout and widgets',
      featureId: '#f3',
      lifecycle: 'requirements',
      state: 'running',
      progress: 10,
    },
  },
  {
    id: 'feat-gateway',
    type: 'featureNode',
    position: { x: 0, y: 0 },
    data: {
      name: 'API Gateway',
      description: 'Rate limiting and routing',
      featureId: '#f4',
      lifecycle: 'deploy',
      state: 'done',
      progress: 100,
    },
  },
  {
    id: 'feat-admin',
    type: 'featureNode',
    position: { x: 0, y: 0 },
    data: {
      name: 'Admin Panel',
      description: 'Internal admin tools',
      featureId: '#f5',
      lifecycle: 'test',
      state: 'blocked',
      progress: 40,
      blockedBy: 'API Gateway',
    },
  },
];

const dagreAddRepo: AddRepositoryNodeType = {
  id: 'add-repo',
  type: 'addRepositoryNode',
  position: { x: 0, y: 0 },
  data: {},
};

const dagreNodesRaw: CanvasNodeType[] = [...dagreRepoNodes, ...dagreFeatureNodes, dagreAddRepo];

const dagreEdges: Edge[] = [
  // cli repo → Auth, SSO
  { id: 'e-cli-auth', source: 'repo-cli', target: 'feat-auth', style: { strokeDasharray: '5 5' } },
  { id: 'e-cli-sso', source: 'repo-cli', target: 'feat-sso', style: { strokeDasharray: '5 5' } },
  // web repo → Dashboard, Admin
  {
    id: 'e-web-dash',
    source: 'repo-web',
    target: 'feat-dashboard',
    style: { strokeDasharray: '5 5' },
  },
  {
    id: 'e-web-admin',
    source: 'repo-web',
    target: 'feat-admin',
    style: { strokeDasharray: '5 5' },
  },
  // Feature dependencies: Auth → Gateway, SSO → Gateway, Gateway → Admin
  { id: 'e-auth-gw', source: 'feat-auth', target: 'feat-gateway' },
  { id: 'e-sso-gw', source: 'feat-sso', target: 'feat-gateway' },
  { id: 'e-gw-admin', source: 'feat-gateway', target: 'feat-admin' },
];

const { nodes: dagreLayoutedNodes, edges: dagreLayoutedEdges } = layoutWithDagre(
  dagreNodesRaw,
  dagreEdges,
  { direction: 'LR' }
);

/**
 * Dagre auto-layout story — two repositories with interconnected feature trees.
 *
 * Demonstrates the Vertical / Horizontal toolbar buttons that re-layout the graph.
 * Initial layout is LR (horizontal). Click "Vertical" to switch to TB, or
 * "Horizontal" to switch back.
 */
export const DagreLayout: Story = {
  args: {
    initialNodes: dagreLayoutedNodes,
    initialEdges: dagreLayoutedEdges,
  },
};
