import type { Meta, StoryObj } from '@storybook/react';
import { InteractiveMessageRole } from '@shepai/core/domain/generated/output';
import { ChatMessageBubble } from './ChatMessageBubble';

const meta: Meta<typeof ChatMessageBubble> = {
  title: 'Features/Chat/ChatMessageBubble',
  component: ChatMessageBubble,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
  },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: '480px', padding: '16px' }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof ChatMessageBubble>;

/** User message — right-aligned with primary color. */
export const UserMessage: Story = {
  args: {
    role: InteractiveMessageRole.user,
    content: 'Can you show me the current test coverage for the auth module?',
    streaming: false,
  },
};

/** Assistant message — left-aligned with muted background. */
export const AssistantMessage: Story = {
  args: {
    role: InteractiveMessageRole.assistant,
    content:
      'Sure! Let me check the test coverage for you.\n\nThe auth module currently has 87% line coverage. The main gaps are in the OAuth callback handler and the token refresh logic.',
    streaming: false,
  },
};

/** Assistant message that is still streaming — shows blinking cursor. */
export const StreamingAssistant: Story = {
  args: {
    role: InteractiveMessageRole.assistant,
    content: 'I can see the coverage report. Let me analyze the gaps',
    streaming: true,
  },
};

/** Assistant message with a code block. */
export const AssistantWithCode: Story = {
  args: {
    role: InteractiveMessageRole.assistant,
    content:
      'Here is the failing test:\n\n```typescript\ndescribe("auth", () => {\n  it("should refresh token", async () => {\n    const token = await refreshToken("expired-token");\n    expect(token).toBeDefined();\n  });\n});\n```\n\nThe test fails because `refreshToken` throws when the token is expired.',
    streaming: false,
  },
};

/** Long user message — should wrap cleanly within the bubble. */
export const LongUserMessage: Story = {
  args: {
    role: InteractiveMessageRole.user,
    content:
      'I need you to help me understand why the CI pipeline is failing on the integration tests. The logs show a database connection timeout after about 30 seconds but only on the CI runner, not locally. Can you look at the test setup and suggest what might be different?',
    streaming: false,
  },
};

/** Multi-line assistant response. */
export const MultilineAssistant: Story = {
  args: {
    role: InteractiveMessageRole.assistant,
    content:
      'I can investigate that for you.\n\nLooking at the CI configuration:\n1. The test database uses a different hostname in CI (`db` vs `localhost`)\n2. The connection pool timeout is set to 10s locally but uses default (30s) in CI\n3. The `DB_POOL_MAX` env var is not set in CI\n\nLet me check the actual test setup file to confirm.',
    streaming: false,
  },
};

/** Assistant message with rich markdown — headers, lists, bold, links. */
export const AssistantWithMarkdown: Story = {
  args: {
    role: InteractiveMessageRole.assistant,
    content:
      '## Analysis Results\n\nI found **3 issues** in the auth module:\n\n1. Missing `try/catch` in token refresh\n2. Expired session cleanup is *not* running\n3. Rate limiter threshold too low\n\n> Note: The rate limiter was changed in [PR #142](https://example.com)\n\nLet me fix these for you.',
    streaming: false,
  },
};

/** Message with timestamp. */
export const WithTimestamp: Story = {
  args: {
    role: InteractiveMessageRole.assistant,
    content: 'Here is the test result. All 42 tests passed.',
    timestamp: new Date().toISOString(),
    streaming: false,
  },
};

/** Conversation thread — both roles rendered together. */
export const ConversationThread: Story = {
  render: () => (
    <div className="flex flex-col gap-3 p-4">
      <ChatMessageBubble
        role={InteractiveMessageRole.assistant}
        content="Hey, how can I help you with this feature?"
        timestamp={new Date(Date.now() - 120000).toISOString()}
      />
      <ChatMessageBubble
        role={InteractiveMessageRole.user}
        content="Can you run the tests and show me the results?"
        timestamp={new Date(Date.now() - 60000).toISOString()}
      />
      <ChatMessageBubble
        role={InteractiveMessageRole.assistant}
        content="Running tests now..."
        streaming={true}
      />
    </div>
  ),
};
