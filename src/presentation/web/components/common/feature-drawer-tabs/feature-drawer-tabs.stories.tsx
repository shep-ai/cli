import type { Meta, StoryObj } from '@storybook/react';
import { PrStatus, CiStatus } from '@shepai/core/domain/generated/output';
import { FeatureDrawerTabs } from './feature-drawer-tabs';
import type { FeatureNodeData } from '@/components/common/feature-node';

const meta: Meta<typeof FeatureDrawerTabs> = {
  title: 'Drawers/Feature/Tabs/FeatureDrawerTabs',
  component: FeatureDrawerTabs,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
  },
  decorators: [
    (Story) => (
      <div style={{ height: '600px', width: '400px', border: '1px solid var(--color-border)' }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof FeatureDrawerTabs>;

/* ---------------------------------------------------------------------------
 * Data fixtures
 * ------------------------------------------------------------------------- */

const runningFeature: FeatureNodeData = {
  name: 'Auth Module',
  description: 'Implement OAuth2 authentication flow with multiple providers',
  featureId: '#f1',
  lifecycle: 'implementation',
  state: 'running',
  progress: 65,
  agentType: 'claude-code',
  runtime: '2h 15m',
  repositoryPath: '/home/user/my-repo',
  branch: 'feat/auth-module',
  pr: {
    url: 'https://github.com/org/repo/pull/42',
    number: 42,
    status: PrStatus.Open,
    ciStatus: CiStatus.Pending,
    commitHash: 'abc1234567890def',
  },
};

const doneFeature: FeatureNodeData = {
  name: 'Payment Gateway',
  description: 'Stripe integration for subscriptions',
  featureId: '#f3',
  lifecycle: 'deploy',
  state: 'done',
  progress: 100,
  runtime: '1h 42m',
  repositoryPath: '/home/user/my-repo',
  branch: 'feat/payment-gateway',
  pr: {
    url: 'https://github.com/org/repo/pull/55',
    number: 55,
    status: PrStatus.Merged,
    ciStatus: CiStatus.Success,
    commitHash: 'def4567890abc123',
  },
};

const requirementsFeature: FeatureNodeData = {
  name: 'API Rate Limiting',
  description: 'Implement sliding window rate limiting for public endpoints',
  featureId: '#bi1',
  lifecycle: 'requirements',
  state: 'action-required',
  progress: 0,
  repositoryPath: '/home/user/my-repo',
  branch: 'feat/api-rate-limiting',
};

const errorFeature: FeatureNodeData = {
  name: 'Email Service',
  description: 'Transactional email with SendGrid',
  featureId: '#f5',
  lifecycle: 'review',
  state: 'error',
  progress: 30,
  errorMessage: 'Build failed: type mismatch in EmailHandler',
  repositoryPath: '/home/user/my-repo',
  branch: 'feat/email-service',
};

/* ---------------------------------------------------------------------------
 * Stories
 *
 * Note: In Storybook, server actions are mocked and return error states.
 * The Overview tab renders fully since it uses FeatureNodeData (no server action).
 * Activity, Messages, and Plan tabs show error states from the mocked actions.
 * See individual tab stories (ActivityTab, MessagesTab, PlanTab) for populated states.
 * ------------------------------------------------------------------------- */

/** Default — running feature with full data. Overview tab active. */
export const Default: Story = {
  args: {
    featureNode: runningFeature,
    featureId: '#f1',
  },
};

/** Completed feature in deploy phase with merged PR. */
export const CompletedFeature: Story = {
  args: {
    featureNode: doneFeature,
    featureId: '#f3',
  },
};

/** Early-stage feature in requirements phase, no progress. */
export const RequirementsPhase: Story = {
  args: {
    featureNode: requirementsFeature,
    featureId: '#bi1',
  },
};

/** Feature in error state. */
export const ErrorState: Story = {
  args: {
    featureNode: errorFeature,
    featureId: '#f5',
  },
};
