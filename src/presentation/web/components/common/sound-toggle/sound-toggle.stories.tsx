import type { Meta, StoryObj } from '@storybook/react';
import { SoundToggle } from './sound-toggle';

const meta: Meta<typeof SoundToggle> = {
  title: 'Composed/SoundToggle',
  component: SoundToggle,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => <SoundToggle />,
};

export const InContext: Story = {
  render: () => (
    <div className="flex items-center gap-4 rounded-lg border p-4">
      <span className="text-muted-foreground text-sm">Toggle sound:</span>
      <SoundToggle />
    </div>
  ),
};
