import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { WorkflowSection } from './workflow-section';
import type { WorkflowConfig } from '@shepai/core/domain/generated/output';

const meta: Meta<typeof WorkflowSection> = {
  title: 'Features/Settings/WorkflowSection',
  component: WorkflowSection,
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

const defaultWorkflow: WorkflowConfig = {
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
};

const allEnabledWorkflow: WorkflowConfig = {
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
};

/* ---------------------------------------------------------------------------
 * Stories
 * ------------------------------------------------------------------------- */

export const Default: Story = {
  args: {
    workflow: defaultWorkflow,
  },
};

export const AllEnabled: Story = {
  args: {
    workflow: allEnabledWorkflow,
  },
};
