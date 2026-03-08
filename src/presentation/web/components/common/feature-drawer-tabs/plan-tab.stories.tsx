import type { Meta, StoryObj } from '@storybook/react';
import { PlanTab } from './plan-tab';
import type { PlanData } from '@/app/actions/get-feature-plan';

const meta: Meta<typeof PlanTab> = {
  title: 'Drawers/Feature/Tabs/PlanTab',
  component: PlanTab,
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
type Story = StoryObj<typeof PlanTab>;

/* ---------------------------------------------------------------------------
 * Data fixtures
 * ------------------------------------------------------------------------- */

const mixedTasksPlan: PlanData = {
  state: 'Ready',
  overview:
    'Implement OAuth2 authentication flow with support for Google and GitHub identity providers. The implementation includes token management, callback handling, and user profile sync.',
  tasks: [
    {
      title: 'Set up OAuth provider configuration',
      description: 'Configure Google and GitHub OAuth apps with client IDs and secrets',
      state: 'Done',
    },
    {
      title: 'Implement callback handler',
      description: 'Handle OAuth callback with authorization code exchange',
      state: 'Done',
    },
    {
      title: 'Add token refresh logic',
      description: 'Implement silent token refresh using refresh tokens stored in httpOnly cookies',
      state: 'Work in Progress',
    },
    {
      title: 'Create user profile sync',
      description: 'Sync user profile data from identity providers on login',
      state: 'Todo',
    },
    {
      title: 'Write integration tests',
      description: 'Test the full OAuth flow with mocked providers',
      state: 'Todo',
    },
    {
      title: 'Update API documentation',
      description: 'Document new authentication endpoints and flows',
      state: 'Review',
    },
  ],
};

const allDonePlan: PlanData = {
  state: 'Ready',
  overview:
    'All implementation tasks for the rate limiting feature have been completed successfully.',
  tasks: [
    {
      title: 'Design sliding window algorithm',
      description: 'Implement Redis-backed sliding window counter',
      state: 'Done',
    },
    {
      title: 'Add rate limit middleware',
      description: 'Express middleware that checks rate limits per IP',
      state: 'Done',
    },
    {
      title: 'Configure limits per endpoint',
      description: 'Set different rate limits for public vs authenticated endpoints',
      state: 'Done',
    },
    {
      title: 'Add rate limit headers',
      description: 'Include X-RateLimit-* headers in responses',
      state: 'Done',
    },
  ],
};

const draftPlan: PlanData = {
  state: 'Requirements',
  overview:
    'Initial plan for implementing the notification system. Requirements are still being gathered.',
  tasks: [
    {
      title: 'Define notification types',
      description: 'Enumerate all notification events and their payloads',
      state: 'Todo',
    },
    {
      title: 'Set up WebSocket server',
      description: 'Configure Socket.io with Redis adapter for horizontal scaling',
      state: 'Todo',
    },
    {
      title: 'Implement notification store',
      description: 'Persist notifications in database with read/unread tracking',
      state: 'Todo',
    },
  ],
};

const clarificationPlan: PlanData = {
  state: 'ClarificationRequired',
  overview: 'Plan requires clarification on the scope of the email template system.',
  tasks: [
    {
      title: 'Set up email provider',
      description: 'Configure SendGrid API integration',
      state: 'Done',
    },
    {
      title: 'Create template engine',
      description: 'Implement Handlebars-based email template rendering',
      state: 'Todo',
    },
  ],
};

const noTasksPlan: PlanData = {
  state: 'Requirements',
  overview: 'Plan overview is available but no tasks have been defined yet.',
  tasks: [],
};

/* ---------------------------------------------------------------------------
 * Stories
 * ------------------------------------------------------------------------- */

/** Default — plan with tasks in various states (Todo, WIP, Done, Review). */
export const Default: Story = {
  args: {
    plan: mixedTasksPlan,
    loading: false,
    error: null,
  },
};

/** All tasks completed. */
export const AllTasksDone: Story = {
  args: {
    plan: allDonePlan,
    loading: false,
    error: null,
  },
};

/** Draft plan in Requirements state. */
export const DraftPlan: Story = {
  args: {
    plan: draftPlan,
    loading: false,
    error: null,
  },
};

/** Plan requiring clarification — ClarificationRequired state badge. */
export const ClarificationRequired: Story = {
  args: {
    plan: clarificationPlan,
    loading: false,
    error: null,
  },
};

/** Plan with overview but no tasks defined yet. */
export const NoTasks: Story = {
  args: {
    plan: noTasksPlan,
    loading: false,
    error: null,
  },
};

/** Loading state — spinner displayed while data is being fetched. */
export const Loading: Story = {
  args: {
    plan: null,
    loading: true,
    error: null,
  },
};

/** Empty state — no plan created yet. */
export const Empty: Story = {
  args: {
    plan: null,
    loading: false,
    error: null,
  },
};

/** Error state — inline error message. */
export const Error: Story = {
  args: {
    plan: null,
    loading: false,
    error: 'Failed to load plan data. Please try again.',
  },
};
