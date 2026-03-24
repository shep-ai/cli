import type { Meta, StoryObj } from '@storybook/react';
import { ChatInput } from './ChatInput';

const meta: Meta<typeof ChatInput> = {
  title: 'Features/Chat/ChatInput',
  component: ChatInput,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
  },
  decorators: [
    (Story) => (
      <div
        style={{
          maxWidth: '480px',
          border: '1px solid var(--color-border)',
          borderRadius: '8px',
          overflow: 'hidden',
        }}
      >
        <Story />
      </div>
    ),
  ],
  args: {
    onSubmit: (content: string) => {
      // eslint-disable-next-line no-console
      console.log('Message submitted:', content);
    },
  },
};

export default meta;
type Story = StoryObj<typeof ChatInput>;

/** Default empty state — ready for input. */
export const Empty: Story = {
  args: {
    disabled: false,
    placeholder: 'Message the agent... (Enter to send, Shift+Enter for newline)',
  },
};

/** With pre-filled text to show how content looks. */
export const WithText: Story = {
  render: (args) => {
    return (
      <div style={{ maxWidth: '480px' }}>
        <ChatInput {...args} />
        <p style={{ padding: '8px', fontSize: '12px', color: 'gray' }}>
          Note: The textarea starts empty; text is shown here for demonstration.
        </p>
      </div>
    );
  },
  args: {
    disabled: false,
    placeholder: 'Can you run the tests for the auth module?',
  },
};

/** Disabled state — shown when the session is not in ready state. */
export const Disabled: Story = {
  args: {
    disabled: true,
    placeholder: 'Start the agent to begin chatting...',
  },
};

/** Custom placeholder text for when the agent is booting. */
export const BootingPlaceholder: Story = {
  args: {
    disabled: true,
    placeholder: 'Waiting for agent to be ready...',
  },
};
