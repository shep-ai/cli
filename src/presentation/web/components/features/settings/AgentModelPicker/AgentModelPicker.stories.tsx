import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { AgentModelPicker } from './index';

const meta: Meta<typeof AgentModelPicker> = {
  title: 'Features/Settings/AgentModelPicker',
  component: AgentModelPicker,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className="w-80">
        <Story />
      </div>
    ),
  ],
  args: {
    onAgentModelChange: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const ClaudeCodeDefault: Story = {
  args: {
    initialAgentType: 'claude-code',
    initialModel: 'claude-sonnet-4-6',
    mode: 'settings',
  },
};

export const CursorSelected: Story = {
  args: {
    initialAgentType: 'cursor',
    initialModel: 'gpt-5.4-high',
    mode: 'settings',
  },
};

export const GeminiCli: Story = {
  args: {
    initialAgentType: 'gemini-cli',
    initialModel: 'gemini-2.5-pro',
    mode: 'settings',
  },
};

export const CodexCliSelected: Story = {
  args: {
    initialAgentType: 'codex-cli',
    initialModel: 'gpt-5.4',
    mode: 'settings',
  },
};

export const DemoAgent: Story = {
  args: {
    initialAgentType: 'dev',
    initialModel: '',
    mode: 'settings',
  },
};

export const OverrideMode: Story = {
  args: {
    initialAgentType: 'claude-code',
    initialModel: 'claude-sonnet-4-6',
    mode: 'override',
  },
};

export const Disabled: Story = {
  args: {
    initialAgentType: 'claude-code',
    initialModel: 'claude-sonnet-4-6',
    mode: 'settings',
    disabled: true,
  },
};
