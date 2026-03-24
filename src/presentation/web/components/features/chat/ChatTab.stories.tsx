import type { Meta, StoryObj } from '@storybook/react';
import { useState, useCallback } from 'react';
import type { ThreadMessageLike, AppendMessage } from '@assistant-ui/react';
import {
  AssistantRuntimeProvider,
  useExternalStoreRuntime,
} from '@assistant-ui/react';
import { Thread } from '@/components/assistant-ui/thread';

// ── Mock runtime wrapper for Storybook ──────────────────────────────────────

function MockChatProvider({
  initialMessages = [],
  simulateDelay = 1500,
  simulateStreaming = true,
  children,
}: {
  initialMessages?: ThreadMessageLike[];
  simulateDelay?: number;
  simulateStreaming?: boolean;
  children: React.ReactNode;
}) {
  const [messages, setMessages] = useState<ThreadMessageLike[]>(initialMessages);
  const [isRunning, setIsRunning] = useState(false);

  const onNew = useCallback(
    async (message: AppendMessage) => {
      const textPart = message.content.find((c) => c.type === 'text');
      if (!textPart || textPart.type !== 'text') return;

      // Add user message
      const userMsg: ThreadMessageLike = {
        id: `user-${Date.now()}`,
        role: 'user',
        content: [{ type: 'text', text: textPart.text }],
        createdAt: new Date(),
      };
      setMessages((prev) => [...prev, userMsg]);

      setIsRunning(true);

      if (simulateStreaming) {
        // Simulate streaming response
        const fullResponse = generateMockResponse(textPart.text);
        const assistantId = `assistant-${Date.now()}`;
        const assistantMsg: ThreadMessageLike = {
          id: assistantId,
          role: 'assistant',
          content: [{ type: 'text', text: '' }],
          createdAt: new Date(),
        };
        setMessages((prev) => [...prev, assistantMsg]);

        // Stream tokens
        const words = fullResponse.split(' ');
        let accumulated = '';
        for (let i = 0; i < words.length; i++) {
          await new Promise((r) => setTimeout(r, 30 + Math.random() * 50));
          accumulated += (i > 0 ? ' ' : '') + words[i];
          const text = accumulated;
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId
                ? { ...m, content: [{ type: 'text', text }] }
                : m
            )
          );
        }
      } else {
        await new Promise((r) => setTimeout(r, simulateDelay));
        const assistantMsg: ThreadMessageLike = {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: [{ type: 'text', text: generateMockResponse(textPart.text) }],
          createdAt: new Date(),
        };
        setMessages((prev) => [...prev, assistantMsg]);
      }

      setIsRunning(false);
    },
    [simulateDelay, simulateStreaming]
  );

  const runtime = useExternalStoreRuntime({
    messages,
    convertMessage: useCallback((msg: ThreadMessageLike): ThreadMessageLike => msg, []),
    isRunning,
    onNew,
  });

  return (
    <AssistantRuntimeProvider runtime={runtime}>{children}</AssistantRuntimeProvider>
  );
}

function generateMockResponse(userMessage: string): string {
  const lower = userMessage.toLowerCase();

  if (lower.includes('test')) {
    return `## Test Results\n\nI ran the test suite and here are the results:\n\n- **42 tests passed**\n- **0 tests failed**\n- **Coverage: 87%**\n\nThe main gaps are in:\n1. OAuth callback handler (3 uncovered branches)\n2. Token refresh logic (missing edge case)\n\n\`\`\`typescript\ndescribe("auth", () => {\n  it("should refresh token", async () => {\n    const token = await refreshToken("expired");\n    expect(token).toBeDefined();\n  });\n});\n\`\`\`\n\nWant me to write the missing tests?`;
  }

  if (lower.includes('fix') || lower.includes('bug')) {
    return `I found the issue. The problem is in the \`handleRequest\` function where the error boundary doesn't catch async rejections.\n\n**Root cause:** The \`try/catch\` block wraps synchronous code, but the database query is awaited outside of it.\n\n**Fix:**\n\`\`\`typescript\nasync function handleRequest(req: Request) {\n  try {\n    const result = await db.query(req.params.id);\n    return Response.json(result);\n  } catch (error) {\n    logger.error("Request failed", { error });\n    return Response.json({ error: "Internal error" }, { status: 500 });\n  }\n}\n\`\`\`\n\nI've applied this fix. Let me know if you want me to add error handling elsewhere.`;
  }

  if (lower.includes('help') || lower.includes('what')) {
    return `I can help you with this feature! Here's what I can do:\n\n1. **Run tests** and analyze coverage\n2. **Fix bugs** by tracing through the code\n3. **Implement features** following the project's patterns\n4. **Review code** for quality and security issues\n\n> Just describe what you need and I'll get started.\n\nFor example, try saying:\n- "Run the auth module tests"\n- "Fix the database connection timeout"\n- "Add input validation to the API endpoint"`;
  }

  return `I understand your request. Let me analyze the codebase and work on this.\n\nLooking at the relevant files:\n- \`src/handlers/main.ts\` — entry point\n- \`src/services/core.ts\` — business logic\n- \`src/utils/helpers.ts\` — shared utilities\n\nI'll make the necessary changes and let you know when it's ready. This should take just a moment.`;
}

// ── Storybook meta ──────────────────────────────────────────────────────────

/**
 * Wrapper component for stories — accepts props that configure the mock.
 */
function ChatStory({
  initialMessages = [],
  simulateStreaming = true,
}: {
  initialMessages?: ThreadMessageLike[];
  simulateStreaming?: boolean;
}) {
  return (
    <MockChatProvider
      initialMessages={initialMessages}
      simulateStreaming={simulateStreaming}
    >
      <Thread />
    </MockChatProvider>
  );
}

const meta: Meta<typeof ChatStory> = {
  title: 'Features/Chat/ChatTab',
  component: ChatStory,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
  },
  decorators: [
    (Story) => (
      <div style={{ height: '600px', maxWidth: '640px', margin: '0 auto', border: '1px solid #e5e7eb' }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof ChatStory>;

/** Empty state — no messages, prompt always visible. Type a message to chat. */
export const Empty: Story = {
  args: {
    initialMessages: [],
    simulateStreaming: true,
  },
};

/** Pre-populated conversation with code blocks, markdown, and multiple turns. */
export const WithHistory: Story = {
  args: {
    initialMessages: [
      {
        id: 'msg-1',
        role: 'user' as const,
        content: [{ type: 'text' as const, text: 'Can you check the test coverage for the auth module?' }],
        createdAt: new Date(Date.now() - 300000),
      },
      {
        id: 'msg-2',
        role: 'assistant' as const,
        content: [
          {
            type: 'text' as const,
            text: '## Test Results\n\nI ran the test suite and here are the results:\n\n- **42 tests passed**\n- **0 tests failed**\n- **Coverage: 87%**\n\nThe main gaps are in:\n1. OAuth callback handler (3 uncovered branches)\n2. Token refresh logic (missing edge case)\n\n```typescript\ndescribe("auth", () => {\n  it("should refresh token", async () => {\n    const token = await refreshToken("expired");\n    expect(token).toBeDefined();\n  });\n});\n```\n\nWant me to write the missing tests?',
          },
        ],
        createdAt: new Date(Date.now() - 240000),
      },
      {
        id: 'msg-3',
        role: 'user' as const,
        content: [{ type: 'text' as const, text: 'Yes, please write the missing tests' }],
        createdAt: new Date(Date.now() - 180000),
      },
      {
        id: 'msg-4',
        role: 'assistant' as const,
        content: [
          {
            type: 'text' as const,
            text: 'I\'ve added the missing tests:\n\n```typescript\ndescribe("OAuth callback", () => {\n  it("should handle expired state parameter", async () => {\n    const result = await handleCallback({ state: "expired" });\n    expect(result.error).toBe("invalid_state");\n  });\n\n  it("should handle missing code parameter", async () => {\n    const result = await handleCallback({ state: "valid" });\n    expect(result.error).toBe("missing_code");\n  });\n\n  it("should handle provider timeout", async () => {\n    jest.spyOn(provider, "exchange").mockRejectedValue(new Error("timeout"));\n    const result = await handleCallback({ state: "valid", code: "abc" });\n    expect(result.error).toBe("provider_error");\n  });\n});\n```\n\nCoverage is now at **94%**. The remaining 6% is defensive error handling that\'s hard to trigger in tests.',
          },
        ],
        createdAt: new Date(Date.now() - 120000),
      },
    ],
    simulateStreaming: true,
  },
};

/** Agent auto-boot message — shown when agent starts on first message. */
export const AutoBoot: Story = {
  args: {
    initialMessages: [
      {
        id: 'status-boot',
        role: 'assistant' as const,
        content: [{ type: 'text' as const, text: 'Agent is waking up...' }],
        createdAt: new Date(),
      },
    ],
    simulateStreaming: true,
  },
};

/** Rich markdown — headers, bold, lists, blockquotes, links, inline code. */
export const RichMarkdown: Story = {
  args: {
    initialMessages: [
      {
        id: 'msg-1',
        role: 'user' as const,
        content: [{ type: 'text' as const, text: 'What can you help me with?' }],
        createdAt: new Date(Date.now() - 60000),
      },
      {
        id: 'msg-2',
        role: 'assistant' as const,
        content: [
          {
            type: 'text' as const,
            text: 'I can help you with this feature! Here\'s what I can do:\n\n1. **Run tests** and analyze coverage\n2. **Fix bugs** by tracing through the code\n3. **Implement features** following the project\'s patterns\n4. **Review code** for quality and security issues\n\n> Just describe what you need and I\'ll get started.\n\nFor example, try saying:\n- "Run the auth module tests"\n- "Fix the database connection timeout"\n- "Add input validation to the API endpoint"',
          },
        ],
        createdAt: new Date(Date.now() - 55000),
      },
      {
        id: 'msg-3',
        role: 'user' as const,
        content: [
          {
            type: 'text' as const,
            text: 'Fix the database connection timeout bug. The CI logs show it fails after 30 seconds but only on the CI runner, not locally.',
          },
        ],
        createdAt: new Date(Date.now() - 50000),
      },
      {
        id: 'msg-4',
        role: 'assistant' as const,
        content: [
          {
            type: 'text' as const,
            text: 'I found the issue. The problem is in the `handleRequest` function where the error boundary doesn\'t catch async rejections.\n\n**Root cause:** The `try/catch` block wraps synchronous code, but the database query is awaited outside of it.\n\n**Fix:**\n```typescript\nasync function handleRequest(req: Request) {\n  try {\n    const result = await db.query(req.params.id);\n    return Response.json(result);\n  } catch (error) {\n    logger.error("Request failed", { error });\n    return Response.json({ error: "Internal error" }, { status: 500 });\n  }\n}\n```\n\nI\'ve applied this fix. Let me know if you want me to add error handling elsewhere.',
          },
        ],
        createdAt: new Date(Date.now() - 40000),
      },
    ],
    simulateStreaming: true,
  },
};

/** Long conversation — many messages to test scrolling behavior. */
export const LongConversation: Story = {
  args: {
    initialMessages: Array.from({ length: 12 }, (_, i) => ({
      id: `msg-${i}`,
      role: (i % 2 === 0 ? 'user' : 'assistant') as 'user' | 'assistant',
      content: [
        {
          type: 'text' as const,
          text:
            i % 2 === 0
              ? `This is user message #${Math.floor(i / 2) + 1}. I'm asking about various aspects of the codebase.`
              : `Here's my response to your question #${Math.floor(i / 2) + 1}. I've analyzed the code and found some interesting patterns.\n\nThe key insight is that the **architecture follows clean separation** of concerns, which makes it easy to test and maintain.\n\n\`\`\`typescript\nconst result = await service.process(input);\nconsole.log(result.status);\n\`\`\``,
        },
      ],
      createdAt: new Date(Date.now() - (12 - i) * 30000),
    })),
    simulateStreaming: true,
  },
};

/** Non-streaming mode — response appears all at once after delay. */
export const NonStreaming: Story = {
  args: {
    initialMessages: [],
    simulateStreaming: false,
  },
};
