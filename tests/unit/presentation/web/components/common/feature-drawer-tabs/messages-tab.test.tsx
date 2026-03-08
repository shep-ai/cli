import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MessagesTab } from '@/components/common/feature-drawer-tabs/messages-tab';
import type { MessageData } from '@/app/actions/get-feature-messages';

const sampleMessages: MessageData[] = [
  {
    role: 'assistant',
    content: 'I will implement the authentication module.',
  },
  {
    role: 'user',
    content: 'Please use OAuth2 for the authentication flow.',
  },
  {
    role: 'assistant',
    content: 'Which provider should I use?',
    options: ['Google', 'GitHub', 'Both'],
    selectedOption: 2,
    answer: 'Both',
  },
];

function renderMessagesTab(
  props: Partial<{
    messages: MessageData[] | null;
    loading: boolean;
    error: string | null;
  }> = {}
) {
  const defaultProps = {
    messages: null as MessageData[] | null,
    loading: false,
    error: null as string | null,
    ...props,
  };
  return render(<MessagesTab {...defaultProps} />);
}

describe('MessagesTab', () => {
  describe('loading state', () => {
    it('renders loading spinner when loading=true', () => {
      renderMessagesTab({ loading: true });
      expect(screen.getByTestId('messages-tab-loading')).toBeInTheDocument();
    });

    it('does not render messages when loading', () => {
      renderMessagesTab({ loading: true, messages: sampleMessages });
      expect(screen.queryByTestId('messages-list')).not.toBeInTheDocument();
    });
  });

  describe('empty state', () => {
    it('renders empty state when messages is null', () => {
      renderMessagesTab({ messages: null });
      expect(screen.getByText('No messages yet')).toBeInTheDocument();
    });

    it('renders empty state when messages array is empty', () => {
      renderMessagesTab({ messages: [] });
      expect(screen.getByText('No messages yet')).toBeInTheDocument();
    });
  });

  describe('error state', () => {
    it('renders error message when error is provided', () => {
      renderMessagesTab({ error: 'Failed to load messages' });
      expect(screen.getByText('Failed to load messages')).toBeInTheDocument();
    });

    it('does not render messages when error is present', () => {
      renderMessagesTab({ error: 'Some error', messages: sampleMessages });
      expect(screen.queryByTestId('messages-list')).not.toBeInTheDocument();
    });
  });

  describe('message rendering', () => {
    it('renders all messages in the list', () => {
      renderMessagesTab({ messages: sampleMessages });
      expect(screen.getByTestId('messages-list')).toBeInTheDocument();
      // 2 assistant messages + 1 user message
      expect(screen.getAllByTestId('message-assistant')).toHaveLength(2);
      expect(screen.getAllByTestId('message-user')).toHaveLength(1);
    });

    it('renders message content', () => {
      renderMessagesTab({ messages: sampleMessages });
      expect(screen.getByText('I will implement the authentication module.')).toBeInTheDocument();
      expect(
        screen.getByText('Please use OAuth2 for the authentication flow.')
      ).toBeInTheDocument();
    });

    it('renders role labels', () => {
      renderMessagesTab({ messages: sampleMessages });
      expect(screen.getAllByText('assistant')).toHaveLength(2);
      expect(screen.getAllByText('user')).toHaveLength(1);
    });
  });

  describe('options and answers', () => {
    it('renders options when present', () => {
      renderMessagesTab({ messages: sampleMessages });
      expect(screen.getByText('Options:')).toBeInTheDocument();
      expect(screen.getByText(/○\s+Google/)).toBeInTheDocument();
      expect(screen.getByText(/○\s+GitHub/)).toBeInTheDocument();
      expect(screen.getByText(/✓\s+Both/)).toBeInTheDocument();
    });

    it('highlights selected option', () => {
      renderMessagesTab({ messages: sampleMessages });
      // selectedOption: 2 → "Both" should have checkmark
      const selectedItem = screen.getByText(/✓ Both/);
      expect(selectedItem).toBeInTheDocument();
    });

    it('renders answer when present', () => {
      renderMessagesTab({ messages: sampleMessages });
      expect(screen.getByText('Answer: Both')).toBeInTheDocument();
    });

    it('does not render options section for messages without options', () => {
      const simpleMessages: MessageData[] = [{ role: 'assistant', content: 'Hello' }];
      renderMessagesTab({ messages: simpleMessages });
      expect(screen.queryByText('Options:')).not.toBeInTheDocument();
    });
  });
});
