import { useMemo } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { expect, fn, waitFor } from '@storybook/test';
import { ReactFlowProvider, ReactFlow, useNodesState } from '@xyflow/react';
import { FeatureNode } from './feature-node';
import type { AgentTypeValue } from './agent-type-icons';
import type {
  FeatureNodeData,
  FeatureNodeType,
  FeatureNodeState,
  FeatureLifecyclePhase,
} from './feature-node-state-config';

const nodeTypes = { featureNode: FeatureNode };

/** Renders a single FeatureNode as a proper React Flow node (with node wrapper + pointer events). */
function FeatureNodeCanvas({
  data,
  style = { width: 600, height: 400 },
}: {
  data: FeatureNodeData;
  style?: React.CSSProperties;
}) {
  const nodes: FeatureNodeType[] = useMemo(
    () => [{ id: 'node-1', type: 'featureNode', position: { x: 0, y: 0 }, data }],
    [data]
  );

  return (
    <div style={style}>
      <ReactFlowProvider>
        <ReactFlow
          nodes={nodes}
          nodeTypes={nodeTypes}
          nodesDraggable={false}
          nodesConnectable={false}
          proOptions={{ hideAttribution: true }}
          fitView
        />
      </ReactFlowProvider>
    </div>
  );
}

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
};

export default meta;
type Story = StoryObj<FeatureNodeData>;

export const Default: Story = {
  render: (args) => <FeatureNodeCanvas data={args} />,
};

const allStatesData: FeatureNodeData[] = [
  {
    name: 'User Onboarding',
    description: 'Implement guided onboarding wizard',
    featureId: '',
    lifecycle: 'requirements' as FeatureLifecyclePhase,
    state: 'creating',
    progress: 0,
    repositoryPath: '/home/user/my-repo',
    branch: '',
  },
  {
    name: 'Auth Module',
    description: 'Implement OAuth2 authentication flow',
    featureId: '#f1',
    lifecycle: 'implementation' as FeatureLifecyclePhase,
    state: 'running',
    progress: 45,
    repositoryPath: '/home/user/my-repo',
    branch: 'feat/auth-module',
  },
  {
    name: 'API Rate Limiting',
    description: 'Implement sliding window rate limiting for public...',
    featureId: '#bi1',
    lifecycle: 'requirements' as FeatureLifecyclePhase,
    state: 'action-required',
    progress: 22,
    repositoryPath: '/home/user/my-repo',
    branch: 'feat/api-rate-limiting',
  },
  {
    name: 'Data Pipeline',
    description: 'ETL pipeline for analytics dashboard',
    featureId: '#bi2',
    lifecycle: 'implementation' as FeatureLifecyclePhase,
    state: 'action-required',
    progress: 40,
    repositoryPath: '/home/user/my-repo',
    branch: 'feat/data-pipeline',
  },
  {
    name: 'Merge Review',
    description: 'PR ready for merge approval',
    featureId: '#bi3',
    lifecycle: 'review' as FeatureLifecyclePhase,
    state: 'action-required',
    progress: 90,
    repositoryPath: '/home/user/my-repo',
    branch: 'feat/merge-review',
  },
  {
    name: 'Payment Gateway',
    description: 'Stripe integration for subscriptions',
    featureId: '#f3',
    lifecycle: 'deploy' as FeatureLifecyclePhase,
    state: 'done',
    progress: 100,
    runtime: '1h 42m',
    repositoryPath: '/home/user/my-repo',
    branch: 'feat/payment-gateway',
  },
  {
    name: 'Search Index',
    description: 'Elasticsearch full-text search setup',
    featureId: '#f4',
    lifecycle: 'implementation' as FeatureLifecyclePhase,
    state: 'blocked',
    progress: 20,
    blockedBy: 'Auth Module',
    repositoryPath: '/home/user/my-repo',
    branch: 'feat/search-index',
  },
  {
    name: 'Email Service',
    description: 'Transactional email with SendGrid',
    featureId: '#f5',
    lifecycle: 'review' as FeatureLifecyclePhase,
    state: 'error',
    progress: 30,
    errorMessage: 'Build failed: type mismatch',
    repositoryPath: '/home/user/my-repo',
    branch: 'feat/email-service',
  },
];

export const AllStates: Story = {
  render: () => (
    <div className="flex flex-wrap gap-6">
      {allStatesData.map((data) => (
        <FeatureNodeCanvas key={data.featureId} style={{ width: 500, height: 350 }} data={data} />
      ))}
    </div>
  ),
};

const allLifecycles: FeatureLifecyclePhase[] = [
  'requirements',
  'research',
  'implementation',
  'review',
  'deploy',
  'maintain',
];

export const AllLifecycles: Story = {
  render: () => (
    <div className="flex flex-wrap gap-6">
      {allLifecycles.map((lifecycle, i) => (
        <FeatureNodeCanvas
          key={lifecycle}
          style={{ width: 500, height: 350 }}
          data={{
            name: 'Feature Name',
            description: `Currently in ${lifecycle} phase`,
            featureId: `#f${i + 1}`,
            lifecycle,
            state: 'running' as FeatureNodeState,
            progress: [10, 25, 50, 70, 90, 100][i],
            repositoryPath: '/home/user/my-repo',
            branch: 'feat/feature-name',
          }}
        />
      ))}
    </div>
  ),
};

const allAgentTypesData: FeatureNodeData[] = [
  {
    name: 'Claude Code Agent',
    description: 'Running with Claude Code executor',
    featureId: '#a1',
    lifecycle: 'implementation' as FeatureLifecyclePhase,
    state: 'running',
    progress: 50,
    agentType: 'claude-code' as AgentTypeValue,
    repositoryPath: '/home/user/my-repo',
    branch: 'feat/claude-code',
  },
  {
    name: 'Cursor Agent',
    description: 'Running with Cursor executor',
    featureId: '#a2',
    lifecycle: 'implementation' as FeatureLifecyclePhase,
    state: 'running',
    progress: 50,
    agentType: 'cursor' as AgentTypeValue,
    repositoryPath: '/home/user/my-repo',
    branch: 'feat/cursor',
  },
  {
    name: 'Gemini CLI Agent',
    description: 'Running with Gemini CLI executor',
    featureId: '#a3',
    lifecycle: 'implementation' as FeatureLifecyclePhase,
    state: 'running',
    progress: 50,
    agentType: 'gemini-cli' as AgentTypeValue,
    repositoryPath: '/home/user/my-repo',
    branch: 'feat/gemini-cli',
  },
  {
    name: 'Aider Agent',
    description: 'Running with Aider executor',
    featureId: '#a4',
    lifecycle: 'implementation' as FeatureLifecyclePhase,
    state: 'running',
    progress: 50,
    agentType: 'aider' as AgentTypeValue,
    repositoryPath: '/home/user/my-repo',
    branch: 'feat/aider',
  },
  {
    name: 'Continue Agent',
    description: 'Running with Continue executor',
    featureId: '#a5',
    lifecycle: 'implementation' as FeatureLifecyclePhase,
    state: 'running',
    progress: 50,
    agentType: 'continue' as AgentTypeValue,
    repositoryPath: '/home/user/my-repo',
    branch: 'feat/continue',
  },
  {
    name: 'Default (No Agent)',
    description: 'Running with no agent type set',
    featureId: '#a6',
    lifecycle: 'implementation' as FeatureLifecyclePhase,
    state: 'running',
    progress: 50,
    repositoryPath: '/home/user/my-repo',
    branch: 'feat/default',
  },
];

export const AllAgentTypes: Story = {
  render: () => (
    <div className="flex flex-wrap gap-6">
      {allAgentTypesData.map((data) => (
        <FeatureNodeCanvas key={data.featureId} style={{ width: 500, height: 350 }} data={data} />
      ))}
    </div>
  ),
};

export const WithAction: Story = {
  argTypes: {
    onAction: { action: 'onAction' },
    onSettings: { action: 'onSettings' },
  },
  render: (args) => <FeatureNodeCanvas data={args} />,
};

export const LongContent: Story = {
  args: {
    name: 'Enterprise Authentication Module With SSO Integration',
    description:
      'Implement a comprehensive OAuth2 authentication flow with support for multiple identity providers including Google, GitHub, and custom SAML-based enterprise SSO',
  },
  render: (args) => <FeatureNodeCanvas data={args} />,
};

export const DoneWithRuntime: Story = {
  args: {
    name: 'Payment Gateway',
    description: 'Stripe integration for subscriptions',
    featureId: '#f3',
    lifecycle: 'deploy',
    state: 'done',
    progress: 100,
    runtime: '2h 15m',
  },
  render: (args) => <FeatureNodeCanvas data={args} />,
};

export const BlockedByFeature: Story = {
  args: {
    name: 'Search Index',
    description: 'Elasticsearch full-text search setup',
    featureId: '#f4',
    lifecycle: 'implementation',
    state: 'blocked',
    progress: 20,
    blockedBy: 'Auth Module',
  },
  render: (args) => <FeatureNodeCanvas data={args} />,
};

export const Creating: Story = {
  args: {
    name: 'User Onboarding',
    description: 'Implement guided onboarding wizard',
    featureId: '',
    lifecycle: 'requirements',
    state: 'creating',
    progress: 0,
  },
  render: (args) => <FeatureNodeCanvas data={args} />,
};

export const MergeReviewActionRequired: Story = {
  args: {
    name: 'Merge Review',
    description: 'PR ready for merge approval',
    featureId: '#bi3',
    lifecycle: 'review',
    state: 'action-required',
    progress: 90,
  },
  render: (args) => <FeatureNodeCanvas data={args} />,
};

export const ErrorWithMessage: Story = {
  args: {
    name: 'Email Service',
    description: 'Transactional email with SendGrid',
    featureId: '#f5',
    lifecycle: 'review',
    state: 'error',
    progress: 30,
    errorMessage: 'Build failed: type mismatch',
  },
  render: (args) => <FeatureNodeCanvas data={args} />,
};

export const WithDeleteButton: Story = {
  args: {
    name: 'Auth Module',
    description: 'Implement OAuth2 authentication flow',
    featureId: '#f1',
    lifecycle: 'implementation',
    state: 'running',
    progress: 45,
    onDelete: fn(),
  },
  render: (args) => <FeatureNodeCanvas data={args} />,
};

const interactiveInitialNodes: FeatureNodeType[] = [
  {
    id: 'node-1',
    type: 'featureNode',
    position: { x: 0, y: 0 },
    draggable: true,
    data: {
      name: 'Auth Module',
      description: 'Implement OAuth2 authentication flow',
      featureId: '#f1',
      lifecycle: 'implementation' as FeatureLifecyclePhase,
      state: 'running' as FeatureNodeState,
      progress: 45,
      repositoryPath: '/home/user/my-repo',
      branch: 'feat/auth-module',
    },
  },
  {
    id: 'node-2',
    type: 'featureNode',
    position: { x: 0, y: 200 },
    draggable: true,
    data: {
      name: 'Payment Gateway',
      description: 'Stripe integration for subscriptions',
      featureId: '#f2',
      lifecycle: 'deploy' as FeatureLifecyclePhase,
      state: 'done' as FeatureNodeState,
      progress: 100,
      runtime: '1h 42m',
      repositoryPath: '/home/user/my-repo',
      branch: 'feat/payment-gateway',
    },
  },
  {
    id: 'node-3',
    type: 'featureNode',
    position: { x: 0, y: 400 },
    draggable: true,
    data: {
      name: 'Email Service',
      description: 'Transactional email with SendGrid',
      featureId: '#f3',
      lifecycle: 'review' as FeatureLifecyclePhase,
      state: 'error' as FeatureNodeState,
      progress: 30,
      errorMessage: 'Build failed: type mismatch',
      repositoryPath: '/home/user/my-repo',
      branch: 'feat/email-service',
    },
  },
];

/** Multi-node canvas with drag enabled — drag nodes to reposition. */
function InteractiveCanvas() {
  const [nodes, , onNodesChange] = useNodesState(interactiveInitialNodes);

  return (
    <div style={{ width: 500, height: 700 }}>
      <ReactFlowProvider>
        <ReactFlow
          nodes={nodes}
          onNodesChange={onNodesChange}
          nodeTypes={nodeTypes}
          nodesDraggable
          nodesConnectable={false}
          proOptions={{ hideAttribution: true }}
          fitView
        />
      </ReactFlowProvider>
    </div>
  );
}

export const Interactive: Story = {
  render: () => <InteractiveCanvas />,
  play: async ({ canvasElement }) => {
    // Verify nodes render in the canvas
    const nodeWrapper = canvasElement.querySelector('.react-flow__node') as HTMLElement;
    await waitFor(() => expect(nodeWrapper).toBeTruthy());
  },
};
