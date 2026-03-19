import { useMemo } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { expect, fn, waitFor } from '@storybook/test';
import { ReactFlowProvider, ReactFlow, useNodesState } from '@xyflow/react';
import { DeploymentState, PrStatus, CiStatus } from '@shepai/core/domain/generated/output';
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
          panOnDrag={false}
          zoomOnScroll={false}
          proOptions={{ hideAttribution: true }}
          fitView
          className="[&_.react-flow__pane]:!cursor-default"
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
    featureId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    lifecycle: 'implementation',
    state: 'running',
    progress: 45,
    agentType: 'claude-code',
    modelId: 'claude-sonnet-4-6',
    repositoryPath: '/home/user/my-repo',
    repositoryName: 'my-repo',
    branch: 'feat/auth-module',
    hasAgentRun: true,
    hasPlan: true,
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
    description: 'Implement guided onboarding wizard with step-by-step tutorial',
    featureId: '',
    lifecycle: 'requirements' as FeatureLifecyclePhase,
    state: 'creating',
    progress: 0,
    repositoryPath: '/home/user/my-repo',
    repositoryName: 'my-repo',
    branch: '',
  },
  {
    name: 'Auth Module',
    description: 'Implement OAuth2 authentication flow with SSO support',
    featureId: '11111111-1111-1111-1111-111111111111',
    lifecycle: 'implementation' as FeatureLifecyclePhase,
    state: 'running',
    progress: 45,
    agentType: 'claude-code' as AgentTypeValue,
    modelId: 'claude-sonnet-4-6',
    repositoryPath: '/home/user/my-repo',
    repositoryName: 'my-repo',
    branch: 'feat/auth-module',
    worktreePath: '/home/user/.shep/repos/abc123/wt/feat-auth-module',
    hasAgentRun: true,
    hasPlan: true,
    deployment: { status: DeploymentState.Ready, url: 'http://localhost:3001' },
  },
  {
    name: 'API Rate Limiting',
    description: 'Implement sliding window rate limiting for public endpoints',
    featureId: '22222222-2222-2222-2222-222222222222',
    lifecycle: 'requirements' as FeatureLifecyclePhase,
    state: 'action-required',
    progress: 22,
    agentType: 'claude-code' as AgentTypeValue,
    modelId: 'claude-sonnet-4-6',
    repositoryPath: '/home/user/my-repo',
    repositoryName: 'my-repo',
    branch: 'feat/api-rate-limiting',
    worktreePath: '/home/user/.shep/repos/abc123/wt/feat-api-rate-limiting',
    hasAgentRun: true,
    hasPlan: true,
  },
  {
    name: 'Data Pipeline',
    description: 'ETL pipeline for analytics dashboard',
    featureId: '33333333-3333-3333-3333-333333333333',
    lifecycle: 'implementation' as FeatureLifecyclePhase,
    state: 'action-required',
    progress: 40,
    agentType: 'cursor' as AgentTypeValue,
    modelId: 'claude-opus-4-6',
    repositoryPath: '/home/user/my-repo',
    repositoryName: 'my-repo',
    branch: 'feat/data-pipeline',
    worktreePath: '/home/user/.shep/repos/abc123/wt/feat-data-pipeline',
    hasAgentRun: true,
    hasPlan: true,
    deployment: { status: DeploymentState.Booting },
  },
  {
    name: 'Merge Review',
    description: 'PR ready for merge approval',
    featureId: '44444444-4444-4444-4444-444444444444',
    lifecycle: 'review' as FeatureLifecyclePhase,
    state: 'action-required',
    progress: 90,
    agentType: 'gemini-cli' as AgentTypeValue,
    modelId: 'gemini-2.5-pro',
    repositoryPath: '/home/user/my-repo',
    repositoryName: 'my-repo',
    branch: 'feat/merge-review',
    worktreePath: '/home/user/.shep/repos/abc123/wt/feat-merge-review',
    hasAgentRun: true,
    hasPlan: true,
    pr: {
      url: 'https://github.com/user/my-repo/pull/87',
      number: 87,
      status: PrStatus.Open,
      ciStatus: CiStatus.Success,
      mergeable: true,
    },
  },
  {
    name: 'Payment Gateway',
    description: 'Stripe integration for subscriptions',
    featureId: '55555555-5555-5555-5555-555555555555',
    lifecycle: 'deploy' as FeatureLifecyclePhase,
    state: 'done',
    progress: 100,
    runtime: '1h 42m',
    agentType: 'claude-code' as AgentTypeValue,
    modelId: 'claude-sonnet-4-6',
    repositoryPath: '/home/user/my-repo',
    repositoryName: 'my-repo',
    branch: 'feat/payment-gateway',
    worktreePath: '/home/user/.shep/repos/abc123/wt/feat-payment-gateway',
    fastMode: true,
    hasAgentRun: true,
    hasPlan: true,
    pr: {
      url: 'https://github.com/user/my-repo/pull/85',
      number: 85,
      status: PrStatus.Merged,
      ciStatus: CiStatus.Success,
    },
    deployment: { status: DeploymentState.Ready, url: 'http://localhost:3002' },
  },
  {
    name: 'Search Index',
    description: 'Elasticsearch full-text search setup',
    featureId: '66666666-6666-6666-6666-666666666666',
    lifecycle: 'implementation' as FeatureLifecyclePhase,
    state: 'blocked',
    progress: 20,
    blockedBy: 'Auth Module',
    agentType: 'claude-code' as AgentTypeValue,
    modelId: 'claude-opus-4-6',
    repositoryPath: '/home/user/my-repo',
    repositoryName: 'my-repo',
    branch: 'feat/search-index',
    worktreePath: '/home/user/.shep/repos/abc123/wt/feat-search-index',
    hasAgentRun: true,
    hasPlan: true,
  },
  {
    name: 'Email Service',
    description: 'Transactional email with SendGrid',
    featureId: '77777777-7777-7777-7777-777777777777',
    lifecycle: 'review' as FeatureLifecyclePhase,
    state: 'error',
    progress: 30,
    errorMessage: 'Build failed: Cannot find module @sendgrid/mail',
    agentType: 'aider' as AgentTypeValue,
    modelId: 'claude-sonnet-4-6',
    repositoryPath: '/home/user/my-repo',
    repositoryName: 'my-repo',
    branch: 'feat/email-service',
    worktreePath: '/home/user/.shep/repos/abc123/wt/feat-email-service',
    hasAgentRun: true,
    hasPlan: true,
    pr: {
      url: 'https://github.com/user/my-repo/pull/86',
      number: 86,
      status: PrStatus.Open,
      ciStatus: CiStatus.Failure,
    },
    onRetry: fn(),
  },
  {
    name: 'Notification Service',
    description: 'Push notification integration',
    featureId: '88888888-8888-8888-8888-888888888888',
    lifecycle: 'pending' as FeatureLifecyclePhase,
    state: 'pending',
    progress: 0,
    repositoryPath: '/home/user/my-repo',
    repositoryName: 'my-repo',
    branch: 'feat/notification-service',
    onStart: fn(),
  },
  {
    name: 'Legacy API Cleanup',
    description: 'Remove deprecated REST endpoints',
    featureId: '99999999-9999-9999-9999-999999999999',
    lifecycle: 'implementation' as FeatureLifecyclePhase,
    state: 'deleting',
    progress: 0,
    repositoryPath: '/home/user/my-repo',
    repositoryName: 'my-repo',
    branch: 'feat/legacy-api-cleanup',
    worktreePath: '/home/user/.shep/repos/abc123/wt/feat-legacy-api-cleanup',
    agentType: 'claude-code' as AgentTypeValue,
    hasAgentRun: true,
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
  'pending',
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
            state: (lifecycle === 'pending' ? 'pending' : 'running') as FeatureNodeState,
            progress: [0, 10, 25, 50, 70, 90, 100][i],
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
    modelId: 'claude-sonnet-4-6',
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
    modelId: 'claude-opus-4-6',
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
    modelId: 'gemini-2.5-pro',
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
    modelId: 'claude-sonnet-4-6',
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
    modelId: 'claude-sonnet-4-6',
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

export const Deleting: Story = {
  args: {
    name: 'Legacy API Cleanup',
    description: 'Remove deprecated REST endpoints',
    featureId: '#f6',
    lifecycle: 'implementation',
    state: 'deleting',
    progress: 0,
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

export const ErrorWithRetry: Story = {
  args: {
    name: 'Email Service',
    description: 'Transactional email with SendGrid',
    featureId: '#f5',
    lifecycle: 'review',
    state: 'error',
    progress: 30,
    errorMessage: 'Build failed: type mismatch',
    onRetry: fn(),
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

export const FastMode: Story = {
  args: {
    name: 'Quick Feature',
    description: 'Fast mode feature — skipping SDLC phases',
    featureId: '#fm1',
    lifecycle: 'implementation',
    state: 'running',
    progress: 50,
    fastMode: true,
    agentType: 'claude-code',
    modelId: 'claude-sonnet-4-6',
  },
  render: (args) => <FeatureNodeCanvas data={args} />,
};

export const FastModeDone: Story = {
  args: {
    name: 'Fast Feature Done',
    description: 'Completed fast mode feature',
    featureId: '#fm2',
    lifecycle: 'deploy',
    state: 'done',
    progress: 100,
    runtime: '12m',
    fastMode: true,
    agentType: 'claude-code',
    modelId: 'claude-sonnet-4-6',
  },
  render: (args) => <FeatureNodeCanvas data={args} />,
};

export const DeploymentBooting: Story = {
  args: {
    name: 'API Server',
    description: 'REST API with Express',
    featureId: '#d1',
    lifecycle: 'deploy',
    state: 'running',
    progress: 80,
    agentType: 'claude-code',
    deployment: { status: DeploymentState.Booting },
  },
  render: (args) => <FeatureNodeCanvas data={args} />,
};

export const DeploymentReady: Story = {
  args: {
    name: 'Web Dashboard',
    description: 'Next.js dashboard app',
    featureId: '#d2',
    lifecycle: 'deploy',
    state: 'done',
    progress: 100,
    runtime: '45m',
    agentType: 'claude-code',
    deployment: { status: DeploymentState.Ready, url: 'http://localhost:3000' },
  },
  render: (args) => <FeatureNodeCanvas data={args} />,
};

export const DeploymentReadyNoUrl: Story = {
  args: {
    name: 'Background Worker',
    description: 'Queue processor service',
    featureId: '#d3',
    lifecycle: 'deploy',
    state: 'done',
    progress: 100,
    runtime: '30m',
    deployment: { status: DeploymentState.Ready },
  },
  render: (args) => <FeatureNodeCanvas data={args} />,
};

export const DeploymentWithFastModeAndAgent: Story = {
  args: {
    name: 'Full Stack App',
    description: 'Next.js app with all inline icons',
    featureId: '#d4',
    lifecycle: 'deploy',
    state: 'done',
    progress: 100,
    runtime: '22m',
    fastMode: true,
    agentType: 'claude-code',
    modelId: 'claude-sonnet-4-6',
    deployment: { status: DeploymentState.Ready, url: 'http://localhost:3000' },
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

export const Pending: Story = {
  args: {
    name: 'Notification Service',
    description: 'Push notification integration',
    featureId: '#p1',
    lifecycle: 'pending',
    state: 'pending',
    progress: 0,
  },
  render: (args) => <FeatureNodeCanvas data={args} />,
};

export const PendingWithStart: Story = {
  args: {
    name: 'Notification Service',
    description: 'Push notification integration — ready to start',
    featureId: '#p2',
    lifecycle: 'pending',
    state: 'pending',
    progress: 0,
    onStart: fn(),
  },
  render: (args) => <FeatureNodeCanvas data={args} />,
};
