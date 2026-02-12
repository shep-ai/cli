import type { Meta, StoryObj } from '@storybook/react';
import { ReactFlowProvider, ReactFlow } from '@xyflow/react';
import { ControlCenterToolbar, type ControlCenterToolbarProps } from './control-center-toolbar';

function ToolbarPreview(props: ControlCenterToolbarProps) {
  return (
    <div style={{ height: '400px' }}>
      <ReactFlowProvider>
        <ReactFlow nodes={[]} edges={[]}>
          <ControlCenterToolbar {...props} />
        </ReactFlow>
      </ReactFlowProvider>
    </div>
  );
}

const meta: Meta<typeof ToolbarPreview> = {
  title: 'Features/ControlCenter/Toolbar',
  component: ToolbarPreview,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {},
};

export const WithCallbacks: Story = {
  args: {
    onAddFeature: () => undefined,
    onLayout: () => undefined,
  },
};
