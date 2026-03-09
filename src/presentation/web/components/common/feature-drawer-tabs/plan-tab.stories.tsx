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
      actionItems: [
        {
          name: 'Create OAuth config module',
          description: 'Define provider configuration schema and load from env',
          acceptanceCriteria: [
            { description: 'Config loads from environment variables', verified: true },
            { description: 'Validation rejects missing client ID or secret', verified: true },
          ],
        },
        {
          name: 'Register OAuth apps',
          description: 'Register apps with Google and GitHub developer consoles',
          acceptanceCriteria: [
            { description: 'Google OAuth app created with correct scopes', verified: true },
            { description: 'GitHub OAuth app created with correct callback URL', verified: true },
          ],
        },
      ],
    },
    {
      title: 'Implement callback handler',
      description: 'Handle OAuth callback with authorization code exchange',
      state: 'Done',
      actionItems: [
        {
          name: 'Build callback endpoint',
          description: 'GET /auth/callback with code exchange logic',
          acceptanceCriteria: [
            { description: 'Exchanges authorization code for tokens', verified: true },
          ],
        },
      ],
    },
    {
      title: 'Add token refresh logic',
      description: 'Implement silent token refresh using refresh tokens stored in httpOnly cookies',
      state: 'Work in Progress',
      actionItems: [
        {
          name: 'Implement refresh endpoint',
          description: 'POST /auth/refresh to issue new access token',
          acceptanceCriteria: [
            { description: 'Returns new access token when refresh token is valid', verified: true },
            { description: 'Returns 401 when refresh token is expired', verified: false },
          ],
        },
        {
          name: 'Add httpOnly cookie handling',
          description: 'Store refresh tokens in secure httpOnly cookies',
          acceptanceCriteria: [
            { description: 'Cookies are set with Secure and HttpOnly flags', verified: false },
          ],
        },
      ],
    },
    {
      title: 'Create user profile sync',
      description: 'Sync user profile data from identity providers on login',
      state: 'Todo',
      actionItems: [
        {
          name: 'Fetch profile from provider',
          description: 'Use access token to retrieve user profile from Google/GitHub',
          acceptanceCriteria: [
            { description: 'Retrieves name, email, and avatar from Google', verified: false },
            { description: 'Retrieves name, email, and avatar from GitHub', verified: false },
          ],
        },
      ],
    },
    {
      title: 'Write integration tests',
      description: 'Test the full OAuth flow with mocked providers',
      state: 'Todo',
      actionItems: [],
    },
    {
      title: 'Update API documentation',
      description: 'Document new authentication endpoints and flows',
      state: 'Review',
      actionItems: [
        {
          name: 'Document auth endpoints',
          description: 'Add OpenAPI specs for all auth routes',
          acceptanceCriteria: [
            { description: 'All endpoints have OpenAPI documentation', verified: true },
            { description: 'Examples included for each endpoint', verified: true },
          ],
        },
      ],
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
      actionItems: [],
    },
    {
      title: 'Add rate limit middleware',
      description: 'Express middleware that checks rate limits per IP',
      state: 'Done',
      actionItems: [],
    },
    {
      title: 'Configure limits per endpoint',
      description: 'Set different rate limits for public vs authenticated endpoints',
      state: 'Done',
      actionItems: [],
    },
    {
      title: 'Add rate limit headers',
      description: 'Include X-RateLimit-* headers in responses',
      state: 'Done',
      actionItems: [],
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
      actionItems: [],
    },
    {
      title: 'Set up WebSocket server',
      description: 'Configure Socket.io with Redis adapter for horizontal scaling',
      state: 'Todo',
      actionItems: [],
    },
    {
      title: 'Implement notification store',
      description: 'Persist notifications in database with read/unread tracking',
      state: 'Todo',
      actionItems: [],
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
      actionItems: [],
    },
    {
      title: 'Create template engine',
      description: 'Implement Handlebars-based email template rendering',
      state: 'Todo',
      actionItems: [],
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
