import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { AgentSection } from './agent-section';
import type { AgentConfig } from '@shepai/core/domain/generated/output';
import { AgentType, AgentAuthMethod } from '@shepai/core/domain/generated/output';

const meta: Meta<typeof AgentSection> = {
  title: 'Features/Settings/AgentSection',
  component: AgentSection,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  args: {
    onSave: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

/* ---------------------------------------------------------------------------
 * Data fixtures
 * ------------------------------------------------------------------------- */

const sessionAuthAgent: AgentConfig = {
  type: AgentType.ClaudeCode,
  authMethod: AgentAuthMethod.Session,
};

const tokenAuthAgent: AgentConfig = {
  type: AgentType.ClaudeCode,
  authMethod: AgentAuthMethod.Token,
  token: 'sk-ant-api03-xxxxxxxxxxxxxxxxxxxx',
};

const tokenAuthEmptyToken: AgentConfig = {
  type: AgentType.ClaudeCode,
  authMethod: AgentAuthMethod.Token,
  token: '',
};

/* ---------------------------------------------------------------------------
 * Stories
 * ------------------------------------------------------------------------- */

export const Default: Story = {
  args: {
    agent: sessionAuthAgent,
  },
};

export const TokenAuth: Story = {
  args: {
    agent: tokenAuthAgent,
  },
};

export const TokenAuthEmptyToken: Story = {
  args: {
    agent: tokenAuthEmptyToken,
  },
};
