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

/** Default — click to toggle theme. Plays toggle-on (dark) or toggle-off (light) sound. */
export const Default: Story = {
  render: () => <ThemeToggle />,
};

/** In context with label. Sounds play on each toggle click. */
export const InContext: Story = {
  render: () => (
    <div className="flex items-center gap-4 rounded-lg border p-4">
      <span className="text-muted-foreground text-sm">Toggle theme:</span>
      <ThemeToggle />
    </div>
  ),
};
