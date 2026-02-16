import { useMemo } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { ReactFlowProvider, ReactFlow } from '@xyflow/react';
import { AddRepositoryNode } from './add-repository-node';
import type { AddRepositoryNodeData, AddRepositoryNodeType } from './add-repository-node-config';

const nodeTypes = { addRepositoryNode: AddRepositoryNode };

function AddRepositoryNodeCanvas({
  data,
  style = { width: 500, height: 250 },
}: {
  data: AddRepositoryNodeData;
  style?: React.CSSProperties;
}) {
  const nodes: AddRepositoryNodeType[] = useMemo(
    () => [{ id: 'node-1', type: 'addRepositoryNode', position: { x: 0, y: 0 }, data }],
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

const meta: Meta<AddRepositoryNodeData> = {
  title: 'Composed/AddRepositoryNode',
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  args: {},
};

export default meta;
type Story = StoryObj<AddRepositoryNodeData>;

export const Default: Story = {
  render: (args) => <AddRepositoryNodeCanvas data={args} />,
};

export const WithCallback: Story = {
  args: {
    onSelect: () => undefined,
  },
  render: (args) => <AddRepositoryNodeCanvas data={args} />,
};
