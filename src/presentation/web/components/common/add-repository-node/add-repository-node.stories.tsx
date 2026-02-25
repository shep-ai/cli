import { useMemo } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { ReactFlowProvider, ReactFlow, Background, Controls, Panel } from '@xyflow/react';
import { AddRepositoryNode } from './add-repository-node';
import { AddRepositoryButton } from './add-repository-button';
import { Loader2 } from 'lucide-react';
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

// --- FAB (Floating Action Button) stories ---

function FABCanvas({
  onSelect,
  style = { width: 600, height: 400 },
}: {
  onSelect?: (path: string) => void;
  style?: React.CSSProperties;
}) {
  return (
    <div style={style}>
      <ReactFlowProvider>
        <ReactFlow
          nodes={[]}
          nodesDraggable={false}
          nodesConnectable={false}
          proOptions={{ hideAttribution: true }}
        >
          <Background />
          <Controls />
          <Panel position="bottom-right" className="mb-4">
            <AddRepositoryButton onSelect={onSelect} />
          </Panel>
        </ReactFlow>
      </ReactFlowProvider>
    </div>
  );
}

/** FAB in default state at bottom-right of the canvas */
export const FABDefault: StoryObj = {
  render: () => <FABCanvas onSelect={() => undefined} />,
};

/**
 * FAB in loading state. Since loading is managed internally via pickFolder,
 * this story uses a wrapper that triggers a click to show the spinner.
 */
function FABLoadingCanvas({
  style = { width: 600, height: 400 },
}: {
  style?: React.CSSProperties;
}) {
  return (
    <div style={style}>
      <ReactFlowProvider>
        <ReactFlow
          nodes={[]}
          nodesDraggable={false}
          nodesConnectable={false}
          proOptions={{ hideAttribution: true }}
        >
          <Background />
          <Controls />
          <Panel position="bottom-right" className="mb-4">
            {/* Render the button's inner markup directly to show loading state */}
            <button
              type="button"
              aria-label="Add Repository"
              disabled
              className="flex h-12 w-12 cursor-pointer items-center justify-center rounded-full bg-blue-500 text-white shadow-lg transition-colors hover:bg-blue-600 disabled:cursor-wait disabled:opacity-60"
            >
              <Loader2 className="h-6 w-6 animate-spin" />
            </button>
          </Panel>
        </ReactFlow>
      </ReactFlowProvider>
    </div>
  );
}

/** FAB showing loading spinner (Loader2 animation) */
export const FABLoading: StoryObj = {
  render: () => <FABLoadingCanvas />,
};
