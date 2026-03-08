import type { Meta, StoryObj } from '@storybook/react';
import { AgentSettingsSection } from './agent-settings-section';
import { AgentType, AgentAuthMethod } from '@shepai/core/domain/generated/output';

const meta = {
  title: 'Features/Settings/AgentSettingsSection',
  component: AgentSettingsSection,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
  },
} satisfies Meta<typeof AgentSettingsSection>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    agent: {
      type: AgentType.ClaudeCode,
      authMethod: AgentAuthMethod.Session,
    },
  },
};

export const TokenAuth: Story = {
  args: {
    agent: {
      type: AgentType.GeminiCli,
      authMethod: AgentAuthMethod.Token,
      token: 'sk-test-token-12345',
    },
  },
};

export const AiderSession: Story = {
  args: {
    agent: {
      type: AgentType.Aider,
      authMethod: AgentAuthMethod.Session,
    },
  },
};
