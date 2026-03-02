import type { Meta, StoryObj } from '@storybook/react';
import { ChatMessageBubble } from './chat-message-bubble';

const meta: Meta<typeof ChatMessageBubble> = {
  title: 'Chat/ChatMessageBubble',
  component: ChatMessageBubble,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  decorators: [
    (Story) => (
      <div className="w-[360px] space-y-2 p-4">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof ChatMessageBubble>;

/** User message — right-aligned with primary background. */
export const UserMessage: Story = {
  args: {
    message: {
      role: 'user',
      content: 'Why did you choose PostgreSQL over MongoDB for this feature?',
    },
  },
};

/** Assistant message — left-aligned with muted background and markdown rendering. */
export const AssistantMessage: Story = {
  args: {
    message: {
      role: 'assistant',
      content:
        'PostgreSQL was chosen because it provides **ACID compliance** and strong support for relational data. The feature requires complex joins across multiple tables.',
    },
  },
};

/** Assistant message with rich markdown content. */
export const AssistantWithMarkdown: Story = {
  args: {
    message: {
      role: 'assistant',
      content: [
        'Here are the key reasons:',
        '',
        '1. **Strong typing** with TypeScript integration',
        '2. Built-in support for `jsonb` columns',
        '3. Better performance for complex queries',
        '',
        'You can read more in the [PostgreSQL docs](https://www.postgresql.org/).',
        '',
        '```sql',
        'SELECT * FROM users WHERE active = true;',
        '```',
      ].join('\n'),
    },
  },
};

/** System error message — warning styling with icon. */
export const SystemError: Story = {
  args: {
    message: {
      role: 'system',
      content: 'Failed to get a response. Please try again.',
    },
  },
};

/** Long message that wraps within the bubble. */
export const LongMessage: Story = {
  args: {
    message: {
      role: 'user',
      content:
        'I have a very detailed question about the architecture. Could you explain why we chose to use Server-Sent Events instead of WebSockets for the real-time streaming? It seems like WebSockets would provide bidirectional communication which could be useful for future features like collaborative editing.',
    },
  },
};
