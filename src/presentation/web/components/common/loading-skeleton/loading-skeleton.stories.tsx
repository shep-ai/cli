import type { Meta, StoryObj } from '@storybook/react';
import { LoadingSkeleton } from './loading-skeleton';

const meta: Meta<typeof LoadingSkeleton> = {
  title: 'Composed/LoadingSkeleton',
  component: LoadingSkeleton,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['line', 'circle', 'card'],
    },
    width: {
      control: 'text',
    },
    height: {
      control: 'text',
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Line: Story = {
  args: {
    variant: 'line',
  },
};

export const Circle: Story = {
  args: {
    variant: 'circle',
  },
};

export const Card: Story = {
  args: {
    variant: 'card',
  },
};

export const CustomDimensions: Story = {
  args: {
    variant: 'line',
    width: '250px',
    height: '20px',
  },
};

export const Group: Story = {
  render: () => (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <LoadingSkeleton variant="circle" />
        <div className="flex-1 space-y-2">
          <LoadingSkeleton variant="line" width="60%" />
          <LoadingSkeleton variant="line" width="40%" />
        </div>
      </div>
      <LoadingSkeleton variant="card" />
      <div className="space-y-2">
        <LoadingSkeleton variant="line" />
        <LoadingSkeleton variant="line" width="80%" />
        <LoadingSkeleton variant="line" width="90%" />
      </div>
    </div>
  ),
};
