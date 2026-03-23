import type { Meta, StoryObj } from '@storybook/react';
import type { Decorator } from '@storybook/react';
import { FeatureSessionsDropdown } from './feature-sessions-dropdown';
import { SessionsProvider } from '@/hooks/sessions-provider';

const REPO_PATH = '/home/user/workspaces/my-project';

const mockSessions = [
  {
    id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    preview: 'Add authentication middleware with JWT token validation',
    messageCount: 24,
    firstMessageAt: new Date(Date.now() - 3_600_000).toISOString(),
    lastMessageAt: new Date(Date.now() - 1_800_000).toISOString(),
    createdAt: new Date(Date.now() - 3_600_000).toISOString(),
    projectPath: REPO_PATH,
  },
  {
    id: 'b2c3d4e5-f6a7-8901-bcde-f12345678901',
    preview: 'Fix failing tests in user service module and update mocks',
    messageCount: 12,
    firstMessageAt: new Date(Date.now() - 86_400_000).toISOString(),
    lastMessageAt: new Date(Date.now() - 82_800_000).toISOString(),
    createdAt: new Date(Date.now() - 86_400_000).toISOString(),
    projectPath: REPO_PATH,
  },
  {
    id: 'c3d4e5f6-a7b8-9012-cdef-123456789012',
    preview: 'Refactor database layer to use repository pattern',
    messageCount: 42,
    firstMessageAt: new Date(Date.now() - 172_800_000).toISOString(),
    lastMessageAt: new Date(Date.now() - 169_200_000).toISOString(),
    createdAt: new Date(Date.now() - 172_800_000).toISOString(),
    projectPath: REPO_PATH,
  },
];

const mockActiveSession = {
  id: 'd4e5f6a7-b8c9-0123-defa-234567890123',
  preview: 'Implementing real-time session tracking feature',
  messageCount: 8,
  firstMessageAt: new Date(Date.now() - 180_000).toISOString(),
  lastMessageAt: new Date(Date.now() - 60_000).toISOString(), // 1 min ago — active
  createdAt: new Date(Date.now() - 180_000).toISOString(),
  projectPath: REPO_PATH,
};

/**
 * Mock fetch for /api/sessions-batch, then wrap with SessionsProvider.
 */
function createSessionsMock(sessions: Record<string, unknown[]>): Decorator {
  return (Story) => {
    const originalFetch = window.fetch;
    window.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      if (url.includes('/api/sessions-batch')) {
        return new Response(JSON.stringify({ sessionsByPath: sessions }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      return originalFetch(input, init);
    }) as typeof window.fetch;

    return (
      <SessionsProvider>
        <Story />
      </SessionsProvider>
    );
  };
}

const meta: Meta<typeof FeatureSessionsDropdown> = {
  title: 'Composed/FeatureSessionsDropdown',
  component: FeatureSessionsDropdown,
  tags: ['autodocs'],
  parameters: { layout: 'centered' },
  args: { repositoryPath: REPO_PATH },
};

export default meta;
type Story = StoryObj<typeof FeatureSessionsDropdown>;

export const WithSessions: Story = {
  decorators: [createSessionsMock({ [REPO_PATH]: mockSessions })],
};

export const WithActiveSessions: Story = {
  decorators: [createSessionsMock({ [REPO_PATH]: [mockActiveSession, ...mockSessions] })],
};

export const Empty: Story = {
  decorators: [createSessionsMock({ [REPO_PATH]: [] })],
};
