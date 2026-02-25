import type { Meta, StoryObj } from '@storybook/react';
import { SettingsPageClient } from './settings-page-client';
import type { Settings } from '@shepai/core/domain/generated/output';
import { AgentType, AgentAuthMethod, EditorType } from '@shepai/core/domain/generated/output';

const meta = {
  title: 'Features/Settings/SettingsPageClient',
  component: SettingsPageClient,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof SettingsPageClient>;

export default meta;
type Story = StoryObj<typeof meta>;

/* ---------------------------------------------------------------------------
 * Data fixtures
 * ------------------------------------------------------------------------- */

const defaultSettings: Settings = {
  id: '00000000-0000-0000-0000-000000000001',
  createdAt: new Date('2025-01-01T00:00:00Z'),
  updatedAt: new Date('2025-06-15T12:00:00Z'),
  onboardingComplete: true,
  models: {
    analyze: 'claude-sonnet-4-5-20250929',
    requirements: 'claude-sonnet-4-5-20250929',
    plan: 'claude-sonnet-4-5-20250929',
    implement: 'claude-sonnet-4-5-20250929',
  },
  agent: {
    type: AgentType.ClaudeCode,
    authMethod: AgentAuthMethod.Session,
  },
  workflow: {
    openPrOnImplementationComplete: false,
    approvalGateDefaults: {
      allowPrd: false,
      allowPlan: false,
      allowMerge: false,
      pushOnImplementationComplete: false,
    },
    ciMaxFixAttempts: 3,
    ciWatchTimeoutMs: 600000,
    ciLogMaxChars: 50000,
  },
  user: {
    name: 'Jane Developer',
    email: 'jane@example.com',
    githubUsername: 'janedev',
  },
  environment: {
    defaultEditor: EditorType.VsCode,
    shellPreference: 'zsh',
  },
  notifications: {
    inApp: { enabled: true },
    browser: { enabled: true },
    desktop: { enabled: false },
    events: {
      agentStarted: true,
      phaseCompleted: true,
      waitingApproval: true,
      agentCompleted: true,
      agentFailed: true,
      prMerged: true,
      prClosed: false,
      prChecksPassed: true,
      prChecksFailed: true,
    },
  },
  system: {
    autoUpdate: true,
    logLevel: 'info',
  },
};

const tokenAuthSettings: Settings = {
  ...defaultSettings,
  id: '00000000-0000-0000-0000-000000000002',
  agent: {
    type: AgentType.ClaudeCode,
    authMethod: AgentAuthMethod.Token,
    token: 'sk-ant-api03-xxxxxxxxxxxx',
  },
  models: {
    analyze: 'claude-opus-4-6',
    requirements: 'claude-sonnet-4-5-20250929',
    plan: 'claude-opus-4-6',
    implement: 'claude-sonnet-4-5-20250929',
  },
};

const allEnabledSettings: Settings = {
  ...defaultSettings,
  id: '00000000-0000-0000-0000-000000000003',
  workflow: {
    openPrOnImplementationComplete: true,
    approvalGateDefaults: {
      allowPrd: true,
      allowPlan: true,
      allowMerge: true,
      pushOnImplementationComplete: true,
    },
    ciMaxFixAttempts: 5,
    ciWatchTimeoutMs: 900000,
    ciLogMaxChars: 100000,
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
};

const minimalSettings: Settings = {
  ...defaultSettings,
  id: '00000000-0000-0000-0000-000000000004',
  user: {},
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
  system: {
    autoUpdate: false,
    logLevel: 'debug',
  },
};

/* ---------------------------------------------------------------------------
 * Stories
 * ------------------------------------------------------------------------- */

export const Default: Story = {
  args: {
    settings: defaultSettings,
  },
};

export const TokenAuth: Story = {
  args: {
    settings: tokenAuthSettings,
  },
};

export const AllEnabled: Story = {
  args: {
    settings: allEnabledSettings,
  },
};

export const Minimal: Story = {
  args: {
    settings: minimalSettings,
  },
};
