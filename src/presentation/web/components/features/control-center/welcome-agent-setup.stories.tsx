import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { WelcomeAgentSetup } from './welcome-agent-setup';

const meta: Meta<typeof WelcomeAgentSetup> = {
  title: 'Features/WelcomeAgentSetup',
  component: WelcomeAgentSetup,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  decorators: [
    (Story) => (
      <div style={{ width: 480, padding: 48, display: 'flex', justifyContent: 'center' }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    onComplete: fn(),
  },
};
