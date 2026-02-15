import type { Meta, StoryObj } from '@storybook/react';
import { ThemeToggle } from './theme-toggle';

const meta: Meta<typeof ThemeToggle> = {
  title: 'Composed/ThemeToggle',
  component: ThemeToggle,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => <ThemeToggle />,
};

export const InContext: Story = {
  render: () => (
    <div className="flex items-center gap-4 rounded-lg border p-4">
      <span className="text-sm text-muted-foreground">Toggle theme:</span>
      <ThemeToggle />
    </div>
  ),
};
