import type { Meta, StoryObj } from '@storybook/react';
import { PrStatus, CiStatus } from '@shepai/core/domain/generated/output';
import { OverviewTab } from './overview-tab';
import type { FeatureNodeData } from '@/components/common/feature-node';

const meta: Meta<typeof OverviewTab> = {
  title: 'Drawers/Feature/Tabs/OverviewTab',
  component: OverviewTab,
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
type Story = StoryObj<typeof OverviewTab>;

/* ---------------------------------------------------------------------------
 * Data fixtures
 * ------------------------------------------------------------------------- */

const fullData: FeatureNodeData = {
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

const noPrData: FeatureNodeData = {
  name: 'Search Index',
  description: 'Elasticsearch full-text search setup',
  featureId: '#f4',
  lifecycle: 'implementation',
  state: 'running',
  progress: 40,
  agentType: 'claude-code',
  repositoryPath: '/home/user/my-repo',
  branch: 'feat/search-index',
};

const noProgressData: FeatureNodeData = {
  name: 'API Rate Limiting',
  description: 'Implement sliding window rate limiting for public endpoints',
  featureId: '#bi1',
  lifecycle: 'requirements',
  state: 'action-required',
  progress: 0,
  repositoryPath: '/home/user/my-repo',
  branch: 'feat/api-rate-limiting',
};

const doneData: FeatureNodeData = {
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

const blockedData: FeatureNodeData = {
  name: 'Email Service',
  description: 'Transactional email with SendGrid',
  featureId: '#f5',
  lifecycle: 'implementation',
  state: 'blocked',
  progress: 20,
  blockedBy: 'Auth Module',
  repositoryPath: '/home/user/my-repo',
  branch: 'feat/email-service',
};

const errorData: FeatureNodeData = {
  name: 'Notification System',
  description: 'Real-time notifications via WebSockets',
  featureId: '#f6',
  lifecycle: 'review',
  state: 'error',
  progress: 30,
  errorMessage: 'Build failed: type mismatch in NotificationHandler',
  repositoryPath: '/home/user/my-repo',
  branch: 'feat/notifications',
};

const minimalData: FeatureNodeData = {
  name: 'Minimal Feature',
  featureId: '#f0',
  lifecycle: 'requirements',
  state: 'creating',
  progress: 0,
  repositoryPath: '/home/user/my-repo',
  branch: '',
};

/* ---------------------------------------------------------------------------
 * Stories
 * ------------------------------------------------------------------------- */

/** Default — full data with status, progress, PR card, and details. */
export const Default: Story = {
  args: { data: fullData },
};

/** Feature with no PR — PR card is hidden. */
export const NoPr: Story = {
  args: { data: noPrData },
};

/** Feature with 0% progress — progress bar is hidden. */
export const NoProgress: Story = {
  args: { data: noProgressData },
};

/** Completed feature in deploy phase with merged PR. */
export const DoneWithMergedPr: Story = {
  args: { data: doneData },
};

/** Blocked feature showing blocked-by detail. */
export const Blocked: Story = {
  args: { data: blockedData },
};

/** Error state showing error message detail. */
export const Error: Story = {
  args: { data: errorData },
};

/** Minimal data — only required fields, no optional details or PR. */
export const Minimal: Story = {
  args: { data: minimalData },
};

/* ---------------------------------------------------------------------------
 * Fast mode stories
 * ------------------------------------------------------------------------- */

const fastModeData: FeatureNodeData = {
  name: 'Quick Fix',
  description: 'Fast mode feature — skipping SDLC phases',
  featureId: '#fm1',
  lifecycle: 'implementation',
  state: 'running',
  progress: 50,
  fastMode: true,
  agentType: 'claude-code',
  repositoryPath: '/home/user/my-repo',
  branch: 'feat/quick-fix',
  userQuery: 'fix the login bug',
  summary: 'Quick fix applied directly from prompt via fast mode',
  createdAt: Date.now() - 10 * 60 * 1000,
  repositoryName: 'my-repo',
  baseBranch: 'main',
};

/** Fast mode feature — shows lightning icon in details section. */
export const FastMode: Story = {
  args: { data: fastModeData },
};

/* ---------------------------------------------------------------------------
 * Lifecycle phase stories
 * ------------------------------------------------------------------------- */

/** Requirements phase. */
export const RequirementsPhase: Story = {
  args: { data: { ...noPrData, lifecycle: 'requirements' as const } },
};

/** Research phase. */
export const ResearchPhase: Story = {
  args: { data: { ...noPrData, lifecycle: 'research' as const } },
};

/** Review phase. */
export const ReviewPhase: Story = {
  args: { data: { ...noPrData, lifecycle: 'review' as const } },
};

/** Maintain phase. */
export const MaintainPhase: Story = {
  args: { data: { ...noPrData, lifecycle: 'maintain' as const } },
};

/** Completed feature with PR — progress hidden, PR shown in status section without borders. */
export const CompletedWithPr: Story = {
  args: {
    data: {
      ...fullData,
      lifecycle: 'maintain' as const,
      state: 'done' as const,
      progress: 100,
      pr: {
        url: 'https://github.com/org/repo/pull/55',
        number: 55,
        status: PrStatus.Merged,
        ciStatus: CiStatus.Success,
        commitHash: 'def4567890abc123',
      },
    },
  },
};
