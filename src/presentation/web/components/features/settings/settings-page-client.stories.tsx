import type { Meta, StoryObj } from '@storybook/react';
import { SettingsPageClient } from './settings-page-client';
import { EditorType, AgentType, AgentAuthMethod } from '@shepai/core/domain/generated/output';
import type { Settings } from '@shepai/core/domain/generated/output';

function makeSettings(overrides?: Partial<Settings>): Settings {
  return {
    id: 'settings-1',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    onboardingComplete: false,
    models: {
      analyze: 'claude-sonnet-4-5',
      requirements: 'claude-sonnet-4-5',
      plan: 'claude-sonnet-4-5',
      implement: 'claude-sonnet-4-5',
    },
    user: {
      name: '',
      email: '',
      githubUsername: '',
    },
    environment: {
      defaultEditor: EditorType.VsCode,
      shellPreference: 'bash',
    },
    system: {
      autoUpdate: true,
      logLevel: 'info',
    },
    agent: {
      type: AgentType.ClaudeCode,
      authMethod: AgentAuthMethod.Session,
      token: '',
    },
    notifications: {
      inApp: { enabled: true },
      browser: { enabled: true },
      desktop: { enabled: true },
      events: {
        agentStarted: true,
        phaseCompleted: true,
        waitingApproval: true,
        agentCompleted: true,
        agentFailed: true,
        prMerged: true,
        prClosed: true,
        prChecksPassed: true,
        prChecksFailed: true,
      },
    },
    workflow: {
      openPrOnImplementationComplete: false,
      approvalGateDefaults: {
        allowPrd: false,
        allowPlan: false,
        allowMerge: false,
        pushOnImplementationComplete: false,
      },
    },
    ...overrides,
  };
}

const meta: Meta<typeof SettingsPageClient> = {
  title: 'Features/SettingsPageClient',
  component: SettingsPageClient,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    settings: makeSettings(),
  },
};

export const WithUserProfile: Story = {
  args: {
    settings: makeSettings({
      user: {
        name: 'John Doe',
        email: 'john@example.com',
        githubUsername: 'johndoe',
      },
    }),
  },
};

export const WithTokenAuth: Story = {
  args: {
    settings: makeSettings({
      agent: {
        type: AgentType.ClaudeCode,
        authMethod: AgentAuthMethod.Token,
        token: 'sk-abc123-secret-token',
      },
    }),
  },
};

export const AllNotificationsDisabled: Story = {
  args: {
    settings: makeSettings({
      notifications: {
        inApp: { enabled: false },
        browser: { enabled: false },
        desktop: { enabled: false },
        events: {
          agentStarted: false,
          phaseCompleted: false,
          waitingApproval: false,
          agentCompleted: false,
          agentFailed: false,
          prMerged: false,
          prClosed: false,
          prChecksPassed: false,
          prChecksFailed: false,
        },
      },
    }),
  },
};

export const WithCIConfig: Story = {
  args: {
    settings: makeSettings({
      workflow: {
        openPrOnImplementationComplete: true,
        approvalGateDefaults: {
          allowPrd: true,
          allowPlan: true,
          allowMerge: false,
          pushOnImplementationComplete: true,
        },
        ciMaxFixAttempts: 3,
        ciWatchTimeoutMs: 600000,
        ciLogMaxChars: 50000,
      },
    }),
  },
};
