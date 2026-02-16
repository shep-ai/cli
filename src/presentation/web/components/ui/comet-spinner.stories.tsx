import type { Meta, StoryObj } from '@storybook/react';
import { CometSpinner } from './comet-spinner';

const meta: Meta<typeof CometSpinner> = {
  title: 'Primitives/CometSpinner',
  component: CometSpinner,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
    },
    duration: {
      control: { type: 'range', min: 1, max: 10, step: 0.5 },
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    size: 'md',
  },
};

export const Small: Story = {
  args: {
    size: 'sm',
  },
};

export const Large: Story = {
  args: {
    size: 'lg',
  },
};

export const AllSizes: Story = {
  render: () => (
    <div className="flex items-center gap-6">
      <CometSpinner size="sm" />
      <CometSpinner size="md" />
      <CometSpinner size="lg" />
    </div>
  ),
};

export const CustomColor: Story = {
  render: () => (
    <div className="flex items-center gap-6">
      <CometSpinner className="text-primary" />
      <CometSpinner className="text-destructive" />
      <CometSpinner className="text-muted-foreground" />
    </div>
  ),
};

export const SlowRotation: Story = {
  args: {
    size: 'lg',
    duration: 8,
  },
};

export const OnDarkBackground: Story = {
  render: () => (
    <div className="flex items-center gap-6 rounded-lg bg-zinc-900 p-8">
      <CometSpinner size="sm" className="text-indigo-400" />
      <CometSpinner size="md" className="text-cyan-400" />
      <CometSpinner size="lg" className="text-violet-400" />
    </div>
  ),
};
