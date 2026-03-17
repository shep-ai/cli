import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { GitHubUrlInput } from './github-url-input';

const meta: Meta<typeof GitHubUrlInput> = {
  title: 'Composed/GitHubUrlInput',
  component: GitHubUrlInput,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  args: {
    onSubmit: fn().mockName('onSubmit'),
  },
  decorators: [
    (Story) => (
      <div style={{ width: 400 }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof GitHubUrlInput>;

export const Default: Story = {};

export const Loading: Story = {
  args: {
    loading: true,
  },
};

export const WithError: Story = {
  // Render pre-filled with invalid URL to demonstrate error state on submit
  render: (args) => <GitHubUrlInput {...args} />,
};

export const Empty: Story = {};
