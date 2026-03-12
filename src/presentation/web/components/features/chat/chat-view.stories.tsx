import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { ChatView, type ChatMessage } from './chat-view';

const meta: Meta<typeof ChatView> = {
  title: 'Features/Chat/ChatView',
  component: ChatView,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
  },
  args: {
    input: '',
    onInputChange: fn(),
    onSubmit: fn(),
    onSuggestionClick: fn(),
    onClear: fn(),
    onRetry: fn(),
  },
  decorators: [
    (Story) => (
      <div style={{ height: '600px' }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof meta>;

const sampleMessages: ChatMessage[] = [
  {
    id: '1',
    role: 'user',
    content: 'What features are currently in progress?',
    timestamp: new Date('2026-03-12T10:00:00'),
    status: 'complete',
  },
  {
    id: '2',
    role: 'assistant',
    content:
      'Here are the features currently in progress:\n\n1. **GPT Chat Interface** — Adding a conversational chat experience\n2. **Task Progress View** — Visualizing task completion status\n\nWould you like more details on any of these?',
    timestamp: new Date('2026-03-12T10:00:05'),
    status: 'complete',
  },
  {
    id: '3',
    role: 'user',
    content: 'Show me an example code block',
    timestamp: new Date('2026-03-12T10:01:00'),
    status: 'complete',
  },
  {
    id: '4',
    role: 'assistant',
    content:
      'Here is an example TypeScript function:\n\n```typescript\nfunction greet(name: string): string {\n  return `Hello, ${name}!`;\n}\n\nconsole.log(greet("World"));\n```\n\nThis function takes a `name` parameter and returns a greeting string.',
    timestamp: new Date('2026-03-12T10:01:05'),
    status: 'complete',
  },
];

export const Empty: Story = {
  args: {
    messages: [],
  },
};

export const WithMessages: Story = {
  args: {
    messages: sampleMessages,
  },
};

export const Streaming: Story = {
  args: {
    messages: [
      ...sampleMessages,
      {
        id: '5',
        role: 'user',
        content: 'Tell me more about the architecture',
        timestamp: new Date('2026-03-12T10:02:00'),
        status: 'complete',
      },
    ],
    isStreaming: true,
  },
};

export const WithError: Story = {
  args: {
    messages: [
      {
        id: '1',
        role: 'user',
        content: 'What features are in progress?',
        timestamp: new Date('2026-03-12T10:00:00'),
        status: 'complete',
      },
      {
        id: '2',
        role: 'assistant',
        content: '',
        timestamp: new Date('2026-03-12T10:00:05'),
        status: 'error',
      },
    ],
    error: 'Failed to connect to the AI agent. Please check your agent configuration.',
  },
};

export const WithInput: Story = {
  args: {
    messages: sampleMessages,
    input: 'How do I add a new feature?',
  },
};

export const LongConversation: Story = {
  args: {
    messages: Array.from({ length: 20 }, (_, i) => ({
      id: String(i + 1),
      role: (i % 2 === 0 ? 'user' : 'assistant') as 'user' | 'assistant',
      content:
        i % 2 === 0
          ? `This is user message number ${Math.floor(i / 2) + 1}`
          : `Here is a response to your question. This is a somewhat longer response that demonstrates how the chat interface handles multi-line content with **markdown formatting** and various text lengths.`,
      timestamp: new Date(`2026-03-12T10:${String(i).padStart(2, '0')}:00`),
      status: 'complete' as const,
    })),
  },
};

export const CodeBlockRendering: Story = {
  args: {
    messages: [
      {
        id: '1',
        role: 'user',
        content: 'Show me a React component example',
        timestamp: new Date('2026-03-12T10:00:00'),
        status: 'complete',
      },
      {
        id: '2',
        role: 'assistant',
        content: `Here's a React component with TypeScript:\n\n\`\`\`tsx\nimport { useState } from 'react';\n\ninterface CounterProps {\n  initialCount?: number;\n}\n\nexport function Counter({ initialCount = 0 }: CounterProps) {\n  const [count, setCount] = useState(initialCount);\n\n  return (\n    <div className="flex items-center gap-2">\n      <button onClick={() => setCount(c => c - 1)}>-</button>\n      <span>{count}</span>\n      <button onClick={() => setCount(c => c + 1)}>+</button>\n    </div>\n  );\n}\n\`\`\`\n\nYou can also use inline code like \`useState\` or \`useEffect\`.`,
        timestamp: new Date('2026-03-12T10:00:05'),
        status: 'complete',
      },
    ],
  },
};

export const Mobile: Story = {
  args: {
    messages: sampleMessages.slice(0, 2),
  },
  parameters: {
    viewport: { defaultViewport: 'mobile1' },
  },
  decorators: [
    (Story) => (
      <div style={{ height: '568px', width: '320px' }}>
        <Story />
      </div>
    ),
  ],
};
