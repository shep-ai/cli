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
        content: 'An error occurred while processing your request.',
        timestamp: new Date('2026-03-12T10:00:05'),
        status: 'error',
      },
    ],
  },
};

export const WithInput: Story = {
  args: {
    messages: sampleMessages,
    input: 'How do I add a new feature?',
  },
};
