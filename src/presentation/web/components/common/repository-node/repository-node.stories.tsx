import { useMemo } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { ReactFlowProvider, ReactFlow } from '@xyflow/react';
import { RepositoryNode } from './repository-node';
import type { RepositoryNodeData, RepositoryNodeType } from './repository-node-config';

const nodeTypes = { repositoryNode: RepositoryNode };

function RepositoryNodeCanvas({
  data,
  style = { width: 500, height: 250 },
}: {
  data: RepositoryNodeData;
  style?: React.CSSProperties;
}) {
  const nodes: RepositoryNodeType[] = useMemo(
    () => [{ id: 'node-1', type: 'repositoryNode', position: { x: 0, y: 0 }, data }],
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

const meta: Meta<RepositoryNodeData> = {
  title: 'Composed/RepositoryNode',
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  args: {
    name: 'shep-ai/cli',
    branch: 'main',
    commitHash: 'a1b2c3d',
  },
};

export default meta;
type Story = StoryObj<RepositoryNodeData>;

export const Default: Story = {
  render: (args) => <RepositoryNodeCanvas data={args} />,
};

export const WithAddButton: Story = {
  argTypes: {
    onAdd: { action: 'onAdd' },
  },
  render: (args) => <RepositoryNodeCanvas data={args} />,
};

export const WithHandles: Story = {
  args: {
    showHandles: true,
  },
  render: (args) => <RepositoryNodeCanvas data={args} />,
};

export const LongName: Story = {
  args: {
    name: 'some-very-long-organization-name/repository-with-a-really-long-name',
  },
  render: (args) => <RepositoryNodeCanvas data={args} />,
};

const onAdd = () => undefined;

const multipleRepos: RepositoryNodeData[] = [
  { name: 'shep-ai/cli', branch: 'main', commitHash: 'a1b2c3d' },
  { name: 'vercel/edge-runtime', branch: 'feat/streaming', commitHash: 'e4f5g6h', behindCount: 3 },
  { name: 'acme-corp/web-dashboard-v2', branch: 'develop', commitHash: 'i7j8k9l', behindCount: 12 },
  { name: 'openai/tiktoken', branch: 'main', commitHash: 'm0n1o2p' },
];

export const Multiple: Story = {
  render: () => {
    const nodes: RepositoryNodeType[] = multipleRepos.map((data, i) => ({
      id: `repo-${i}`,
      type: 'repositoryNode' as const,
      position: { x: 0, y: i * 100 },
      data,
    }));

    return (
      <div style={{ width: 550, height: 600 }}>
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
  },
};

const multipleReposWithButton: RepositoryNodeData[] = [
  { name: 'shep-ai/cli', onAdd, branch: 'main', commitHash: 'a1b2c3d' },
  {
    name: 'vercel/edge-runtime',
    onAdd,
    branch: 'feat/streaming',
    commitHash: 'e4f5g6h',
    behindCount: 3,
  },
  { name: 'acme-corp/web-dashboard-v2', onAdd, branch: 'develop', commitHash: 'i7j8k9l' },
  { name: 'openai/tiktoken', onAdd, branch: 'main', commitHash: 'm0n1o2p' },
];

export const MultipleWithButton: Story = {
  render: () => {
    const nodes: RepositoryNodeType[] = multipleReposWithButton.map((data, i) => ({
      id: `repo-${i}`,
      type: 'repositoryNode' as const,
      position: { x: 0, y: i * 100 },
      data,
    }));

    return (
      <div style={{ width: 550, height: 600 }}>
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
  },
};

export const WithPulseAdd: Story = {
  args: {
    repositoryPath: '/home/user/shep-ai/cli',
    pulseAdd: true,
  },
  argTypes: {
    onAdd: { action: 'onAdd' },
  },
  render: (args) => <RepositoryNodeCanvas data={args} />,
};

export const WithActions: Story = {
  args: {
    repositoryPath: '/home/user/shep-ai/cli',
  },
  render: (args) => <RepositoryNodeCanvas data={args} />,
};

export const WithActionsAndAddButton: Story = {
  args: {
    repositoryPath: '/home/user/shep-ai/cli',
  },
  argTypes: {
    onAdd: { action: 'onAdd' },
  },
  render: (args) => <RepositoryNodeCanvas data={args} />,
};

const onDelete = () => undefined;

export const WithDeleteButton: Story = {
  args: {
    id: 'repo-abc-123',
    repositoryPath: '/home/user/shep-ai/cli',
  },
  argTypes: {
    onDelete: { action: 'onDelete' },
  },
  render: (args) => <RepositoryNodeCanvas data={args} style={{ width: 550, height: 250 }} />,
};

const multipleReposWithActions: RepositoryNodeData[] = [
  {
    id: 'r1',
    name: 'shep-ai/cli',
    repositoryPath: '/home/user/shep-ai/cli',
    onAdd,
    onDelete,
    branch: 'main',
    commitHash: '60ef554',
  },
  {
    id: 'r2',
    name: 'vercel/edge-runtime',
    repositoryPath: '/home/user/vercel/edge-runtime',
    onAdd,
    onDelete,
    branch: 'feat/streaming-v2',
    commitHash: 'e4f5g6h',
    behindCount: 5,
  },
  {
    id: 'r3',
    name: 'acme-corp/web-dashboard-v2',
    repositoryPath: '/home/user/acme-corp/web-dashboard-v2',
    onAdd,
    onDelete,
    branch: 'develop',
    commitHash: 'i7j8k9l',
    behindCount: 23,
  },
  {
    id: 'r4',
    name: 'openai/tiktoken',
    repositoryPath: '/home/user/openai/tiktoken',
    onAdd,
    onDelete,
    branch: 'main',
    commitHash: 'm0n1o2p',
  },
];

export const MultipleWithActions: Story = {
  render: () => {
    const nodes: RepositoryNodeType[] = multipleReposWithActions.map((data, i) => ({
      id: `repo-${i}`,
      type: 'repositoryNode' as const,
      position: { x: 0, y: i * 100 },
      data,
    }));

    return (
      <div style={{ width: 550, height: 600 }}>
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
  },
};

export const WithGitInfo: Story = {
  args: {
    repositoryPath: '/home/user/shep-ai/cli',
    branch: 'feat/repo-node-enrichment',
    commitHash: '60ef554',
    behindCount: 0,
  },
  render: (args) => <RepositoryNodeCanvas data={args} />,
};

export const WithGitInfoBehind: Story = {
  args: {
    repositoryPath: '/home/user/shep-ai/cli',
    branch: 'feat/old-feature-branch',
    commitHash: 'abc1234',
    behindCount: 7,
  },
  render: (args) => <RepositoryNodeCanvas data={args} />,
};
