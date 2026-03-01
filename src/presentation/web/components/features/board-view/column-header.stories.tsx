import type { Meta, StoryObj } from '@storybook/react';
import { ColumnHeader } from './column-header';

const meta: Meta<typeof ColumnHeader> = {
  title: 'Features/BoardView/ColumnHeader',
  component: ColumnHeader,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 300, border: '1px solid #eee', borderRadius: 8 }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { label: 'Implementation', count: 8 },
};

export const ZeroCount: Story = {
  args: { label: 'Done', count: 0 },
};

export const LargeCount: Story = {
  args: { label: 'Backlog', count: 156 },
};

export const SmallCount: Story = {
  args: { label: 'Review', count: 2 },
};
