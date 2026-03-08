import type { Meta, StoryObj } from '@storybook/react';
import { MessagesTab } from './messages-tab';
import type { MessageData } from '@/app/actions/get-feature-messages';

const meta: Meta<typeof MessagesTab> = {
  title: 'Drawers/Feature/Tabs/MessagesTab',
  component: MessagesTab,
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
type Story = StoryObj<typeof MessagesTab>;

/* ---------------------------------------------------------------------------
 * Data fixtures
 * ------------------------------------------------------------------------- */

const mixedRoleMessages: MessageData[] = [
  {
    role: 'assistant',
    content:
      'I will implement the OAuth2 authentication flow. Let me start by analyzing the existing codebase to understand the current auth patterns.',
  },
  {
    role: 'user',
    content: 'Please make sure to support Google and GitHub as identity providers.',
  },
  {
    role: 'assistant',
    content:
      'Understood. I will implement support for both Google and GitHub OAuth providers. I have identified the following files that need to be modified:\n\n- src/auth/providers.ts\n- src/auth/callback-handler.ts\n- src/config/oauth.ts',
  },
  {
    role: 'user',
    content: 'Looks good. Please also add refresh token support.',
  },
  {
    role: 'assistant',
    content:
      'I have completed the implementation with refresh token support. The changes include:\n\n1. Token refresh endpoint at /api/auth/refresh\n2. Automatic token rotation on expiry\n3. Secure httpOnly cookie storage for refresh tokens',
  },
];

const messagesWithOptions: MessageData[] = [
  {
    role: 'assistant',
    content: 'Which authentication strategy should we use for the API endpoints?',
    options: [
      'JWT with refresh tokens',
      'Session-based auth',
      'API key authentication',
      'OAuth2 bearer tokens',
    ],
    selectedOption: 0,
    answer: 'JWT with refresh tokens',
  },
  {
    role: 'user',
    content: 'JWT with refresh tokens is the right choice for our use case.',
  },
  {
    role: 'assistant',
    content: 'How should we handle token expiration?',
    options: ['Silent refresh', 'Redirect to login', 'Show warning before expiry'],
    selectedOption: 2,
    answer: 'Show warning before expiry',
  },
  {
    role: 'assistant',
    content:
      'I will implement the JWT authentication with silent refresh tokens and a warning notification shown 5 minutes before token expiry.',
  },
];

const singleMessage: MessageData[] = [
  {
    role: 'assistant',
    content:
      'Starting feature analysis. I will review the codebase and propose an implementation plan.',
  },
];

/* ---------------------------------------------------------------------------
 * Stories
 * ------------------------------------------------------------------------- */

/** Default — mixed assistant and user messages. */
export const Default: Story = {
  args: {
    messages: mixedRoleMessages,
    loading: false,
    error: null,
  },
};

/** Messages with options — shows options list with selected answers highlighted. */
export const WithOptions: Story = {
  args: {
    messages: messagesWithOptions,
    loading: false,
    error: null,
  },
};

/** Single message — minimal conversation. */
export const SingleMessage: Story = {
  args: {
    messages: singleMessage,
    loading: false,
    error: null,
  },
};

/** Loading state — spinner displayed while data is being fetched. */
export const Loading: Story = {
  args: {
    messages: null,
    loading: true,
    error: null,
  },
};

/** Empty state — no messages yet. */
export const Empty: Story = {
  args: {
    messages: [],
    loading: false,
    error: null,
  },
};

/** Error state — inline error message. */
export const Error: Story = {
  args: {
    messages: null,
    loading: false,
    error: 'Failed to load messages. Please try again.',
  },
};
