import type { Meta, StoryObj } from '@storybook/react';
import { WorkflowSettingsSection } from './workflow-settings-section';

const meta = {
  title: 'Features/Settings/WorkflowSettingsSection',
  component: WorkflowSettingsSection,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
  },
} satisfies Meta<typeof WorkflowSettingsSection>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    workflow: {
      openPrOnImplementationComplete: false,
      approvalGateDefaults: {
        allowPrd: false,
        allowPlan: false,
        allowMerge: false,
        pushOnImplementationComplete: false,
      },
      enableEvidence: false,
      commitEvidence: false,
    },
  },
};

export const AllEnabled: Story = {
  args: {
    workflow: {
      openPrOnImplementationComplete: true,
      approvalGateDefaults: {
        allowPrd: true,
        allowPlan: true,
        allowMerge: true,
        pushOnImplementationComplete: true,
      },
      ciMaxFixAttempts: 3,
      ciWatchTimeoutMs: 300000,
      ciLogMaxChars: 50000,
      stageTimeoutMs: 600000,
      enableEvidence: true,
      commitEvidence: true,
    },
  },
};

export const WithCiSettings: Story = {
  args: {
    workflow: {
      openPrOnImplementationComplete: false,
      approvalGateDefaults: {
        allowPrd: false,
        allowPlan: false,
        allowMerge: false,
        pushOnImplementationComplete: false,
      },
      ciMaxFixAttempts: 5,
      ciWatchTimeoutMs: 600000,
      ciLogMaxChars: 100000,
      stageTimeoutMs: 1200000,
      enableEvidence: false,
      commitEvidence: false,
    },
  },
};
