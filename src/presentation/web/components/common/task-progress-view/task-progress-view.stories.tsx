import type { Meta, StoryObj } from '@storybook/react';
import { TaskProgressView } from './task-progress-view';
import type { PlanTaskData } from '@/app/actions/get-feature-plan';

const meta: Meta<typeof TaskProgressView> = {
  title: 'Composed/TaskProgressView',
  component: TaskProgressView,
  tags: ['autodocs'],
  parameters: { layout: 'padded' },
  decorators: [
    (Story) => (
      <div style={{ width: '400px', border: '1px solid var(--color-border)', padding: '16px' }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof TaskProgressView>;

/* ---------------------------------------------------------------------------
 * Data fixtures
 * ------------------------------------------------------------------------- */

const mixedTasks: PlanTaskData[] = [
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
];

const allDoneTasks: PlanTaskData[] = [
  {
    title: 'Design sliding window algorithm',
    description: 'Implement Redis-backed sliding window counter',
    state: 'Done',
    actionItems: [
      {
        name: 'Implement counter',
        description: 'Redis ZADD-based sliding window',
        acceptanceCriteria: [
          { description: 'Counts requests in time window', verified: true },
          { description: 'Cleans up expired entries', verified: true },
        ],
      },
    ],
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
];

const allTodoTasks: PlanTaskData[] = [
  {
    title: 'Define notification types',
    description: 'Enumerate all notification events and their payloads',
    state: 'Todo',
    actionItems: [],
  },
  {
    title: 'Set up WebSocket server',
    description: 'Configure Socket.io with Redis adapter',
    state: 'Todo',
    actionItems: [],
  },
  {
    title: 'Implement notification store',
    description: 'Persist notifications in database',
    state: 'Todo',
    actionItems: [],
  },
];

/* ---------------------------------------------------------------------------
 * Stories
 * ------------------------------------------------------------------------- */

/** Default — tasks in mixed states with action items and acceptance criteria. */
export const Default: Story = {
  args: {
    tasks: mixedTasks,
  },
};

/** All tasks completed. */
export const AllDone: Story = {
  args: {
    tasks: allDoneTasks,
  },
};

/** All tasks in Todo state. */
export const AllTodo: Story = {
  args: {
    tasks: allTodoTasks,
  },
};

/** Empty — no tasks defined. */
export const Empty: Story = {
  args: {
    tasks: [],
  },
};

/** Single task with detailed action items. */
export const SingleTaskDetailed: Story = {
  args: {
    tasks: [mixedTasks[2]],
  },
};
