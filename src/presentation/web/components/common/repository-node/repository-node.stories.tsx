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
  { name: 'shep-ai/cli' },
  { name: 'vercel/edge-runtime' },
  { name: 'acme-corp/web-dashboard-v2' },
  { name: 'openai/tiktoken' },
];

export const Multiple: Story = {
  render: () => {
    const nodes: RepositoryNodeType[] = multipleRepos.map((data, i) => ({
      id: `repo-${i}`,
      type: 'repositoryNode' as const,
      position: { x: 0, y: i * 80 },
      data,
    }));

    return (
      <div style={{ width: 500, height: 500 }}>
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
  { name: 'shep-ai/cli', onAdd },
  { name: 'vercel/edge-runtime', onAdd },
  { name: 'acme-corp/web-dashboard-v2', onAdd },
  { name: 'openai/tiktoken', onAdd },
];

export const MultipleWithButton: Story = {
  render: () => {
    const nodes: RepositoryNodeType[] = multipleReposWithButton.map((data, i) => ({
      id: `repo-${i}`,
      type: 'repositoryNode' as const,
      position: { x: 0, y: i * 80 },
      data,
    }));

    return (
      <div style={{ width: 500, height: 500 }}>
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

const multipleReposWithActions: RepositoryNodeData[] = [
  { name: 'shep-ai/cli', repositoryPath: '/home/user/shep-ai/cli', onAdd },
  { name: 'vercel/edge-runtime', repositoryPath: '/home/user/vercel/edge-runtime', onAdd },
  {
    name: 'acme-corp/web-dashboard-v2',
    repositoryPath: '/home/user/acme-corp/web-dashboard-v2',
    onAdd,
  },
  { name: 'openai/tiktoken', repositoryPath: '/home/user/openai/tiktoken', onAdd },
];

export const MultipleWithActions: Story = {
  render: () => {
    const nodes: RepositoryNodeType[] = multipleReposWithActions.map((data, i) => ({
      id: `repo-${i}`,
      type: 'repositoryNode' as const,
      position: { x: 0, y: i * 80 },
      data,
    }));

    return (
      <div style={{ width: 500, height: 500 }}>
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
