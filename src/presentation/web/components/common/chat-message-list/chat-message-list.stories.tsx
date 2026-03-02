import type { Meta, StoryObj } from '@storybook/react';
import { ChatMessageList } from './chat-message-list';
import type { ChatMessage } from '@/components/common/chat-message-bubble';

const sampleMessages: ChatMessage[] = [
  { role: 'user', content: 'Why did you choose PostgreSQL?' },
  {
    role: 'assistant',
    content:
      'PostgreSQL was chosen for its **ACID compliance** and strong support for relational data modeling.',
  },
  { role: 'user', content: 'What about MongoDB?' },
  {
    role: 'assistant',
    content:
      'MongoDB was considered but rejected because the feature requires complex joins across multiple tables, which MongoDB handles less efficiently.',
  },
];

const meta: Meta<typeof ChatMessageList> = {
  title: 'Chat/ChatMessageList',
  component: ChatMessageList,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  decorators: [
    (Story) => (
      <div className="w-[400px] rounded-md border">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof ChatMessageList>;

/** Empty state — no messages yet. */
export const Empty: Story = {
  args: {
    messages: [],
  },
};

/** Single message from the user. */
export const SingleMessage: Story = {
  args: {
    messages: [{ role: 'user', content: 'Why did you choose this approach?' }],
  },
};

/** Multiple messages in a conversation. */
export const MultipleMessages: Story = {
  args: {
    messages: sampleMessages,
  },
};

/** Long conversation with many messages. */
export const LongConversation: Story = {
  args: {
    messages: [
      ...sampleMessages,
      { role: 'user', content: 'Can we use SQLite instead?' },
      {
        role: 'assistant',
        content: 'SQLite is a great choice for development, but lacks concurrent write support.',
      },
      { role: 'user', content: 'What about scaling concerns?' },
      {
        role: 'assistant',
        content:
          'PostgreSQL handles scaling well with read replicas and connection pooling via `pgBouncer`.',
      },
      { role: 'system', content: 'Connection lost. Please try again.' },
    ],
  },
};

/** Streaming state — last message is being generated. */
export const Streaming: Story = {
  args: {
    messages: [
      { role: 'user', content: 'Explain the trade-offs' },
      { role: 'assistant', content: 'The main trade-offs are...' },
    ],
    isStreaming: true,
  },
};
