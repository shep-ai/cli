import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ChatView, type ChatMessage } from '@/components/features/chat/chat-view';

const baseProps = {
  messages: [] as ChatMessage[],
  input: '',
  onInputChange: vi.fn(),
  onSubmit: vi.fn(),
  onSuggestionClick: vi.fn(),
  onClear: vi.fn(),
  onRetry: vi.fn(),
};

const sampleMessages: ChatMessage[] = [
  {
    id: '1',
    role: 'user',
    content: 'Hello',
    timestamp: new Date('2026-03-12T10:00:00'),
    status: 'complete',
  },
  {
    id: '2',
    role: 'assistant',
    content: 'Hi there! How can I help?',
    timestamp: new Date('2026-03-12T10:00:05'),
    status: 'complete',
  },
];

describe('ChatView', () => {
  describe('empty state', () => {
    it('renders empty state when no messages exist', () => {
      render(<ChatView {...baseProps} messages={[]} />);

      expect(screen.getByText('Chat with Shep')).toBeInTheDocument();
      expect(screen.getByText('Ask me anything about your project')).toBeInTheDocument();
    });

    it('renders suggestion chips in empty state', () => {
      render(<ChatView {...baseProps} messages={[]} />);

      expect(screen.getByText('What features are in progress?')).toBeInTheDocument();
      expect(screen.getByText('Help me plan a new feature')).toBeInTheDocument();
    });

    it('calls onSuggestionClick when a suggestion chip is clicked', () => {
      const onSuggestionClick = vi.fn();
      render(<ChatView {...baseProps} messages={[]} onSuggestionClick={onSuggestionClick} />);

      fireEvent.click(screen.getByText('What features are in progress?'));

      expect(onSuggestionClick).toHaveBeenCalledWith('What features are in progress?');
    });
  });

  describe('message rendering', () => {
    it('renders user and assistant messages', () => {
      render(<ChatView {...baseProps} messages={sampleMessages} />);

      expect(screen.getByText('Hello')).toBeInTheDocument();
      expect(screen.getByText(/Hi there/)).toBeInTheDocument();
    });

    it('does not show empty state when messages exist', () => {
      render(<ChatView {...baseProps} messages={sampleMessages} />);

      expect(screen.queryByText('Chat with Shep')).not.toBeInTheDocument();
    });
  });

  describe('loading/streaming state', () => {
    it('shows thinking indicator when streaming and last message is from user', () => {
      const userMessage: ChatMessage = {
        id: '1',
        role: 'user',
        content: 'Tell me something',
        timestamp: new Date(),
        status: 'complete',
      };

      render(<ChatView {...baseProps} messages={[userMessage]} isStreaming={true} />);

      expect(screen.getByLabelText('Shep is thinking')).toBeInTheDocument();
    });

    it('does not show thinking indicator when not streaming', () => {
      render(<ChatView {...baseProps} messages={sampleMessages} isStreaming={false} />);

      expect(screen.queryByLabelText('Shep is thinking')).not.toBeInTheDocument();
    });

    it('disables send button when streaming', () => {
      render(<ChatView {...baseProps} messages={sampleMessages} input="test" isStreaming={true} />);

      const sendButton = screen.getByRole('button', { name: 'Send message' });
      expect(sendButton).toBeDisabled();
    });
  });

  describe('input interaction', () => {
    it('disables send button when input is empty', () => {
      render(<ChatView {...baseProps} messages={sampleMessages} input="" />);

      const sendButton = screen.getByRole('button', { name: 'Send message' });
      expect(sendButton).toBeDisabled();
    });

    it('enables send button when input has text and not streaming', () => {
      render(
        <ChatView {...baseProps} messages={sampleMessages} input="hello" isStreaming={false} />
      );

      const sendButton = screen.getByRole('button', { name: 'Send message' });
      expect(sendButton).not.toBeDisabled();
    });

    it('calls onSubmit when send button is clicked', () => {
      const onSubmit = vi.fn();
      render(
        <ChatView {...baseProps} messages={sampleMessages} input="hello" onSubmit={onSubmit} />
      );

      fireEvent.click(screen.getByRole('button', { name: 'Send message' }));

      expect(onSubmit).toHaveBeenCalledTimes(1);
    });
  });

  describe('error handling', () => {
    it('renders inline error message when error is set', () => {
      render(
        <ChatView
          {...baseProps}
          messages={sampleMessages}
          error="Failed to connect to the AI agent"
        />
      );

      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText('Failed to connect to the AI agent')).toBeInTheDocument();
    });

    it('renders retry button in error alert', () => {
      const onRetry = vi.fn();
      render(
        <ChatView
          {...baseProps}
          messages={sampleMessages}
          error="Network error"
          onRetry={onRetry}
        />
      );

      const retryButton = screen.getByRole('button', { name: 'Retry last message' });
      expect(retryButton).toBeInTheDocument();

      fireEvent.click(retryButton);
      expect(onRetry).toHaveBeenCalledTimes(1);
    });

    it('does not show error alert when streaming', () => {
      render(
        <ChatView {...baseProps} messages={sampleMessages} error="Some error" isStreaming={true} />
      );

      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('shows retry button on individual error messages', () => {
      const errorMessages: ChatMessage[] = [
        {
          id: '1',
          role: 'user',
          content: 'Hello',
          timestamp: new Date(),
          status: 'complete',
        },
        {
          id: '2',
          role: 'assistant',
          content: '',
          timestamp: new Date(),
          status: 'error',
        },
      ];
      const onRetry = vi.fn();

      render(<ChatView {...baseProps} messages={errorMessages} onRetry={onRetry} />);

      const retryButton = screen.getByRole('button', { name: 'Retry sending message' });
      fireEvent.click(retryButton);

      expect(onRetry).toHaveBeenCalledTimes(1);
    });
  });

  describe('clear conversation', () => {
    it('renders clear button in header', () => {
      render(<ChatView {...baseProps} messages={sampleMessages} />);

      expect(screen.getByRole('button', { name: 'Clear conversation' })).toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('has an aria-live region for messages', () => {
      render(<ChatView {...baseProps} messages={sampleMessages} />);

      const liveRegion = screen.getByRole('log', { hidden: true });
      expect(liveRegion).toBeInTheDocument();
    });

    it('has accessible label on the prompt input', () => {
      render(<ChatView {...baseProps} messages={sampleMessages} />);

      expect(screen.getByLabelText('Chat message input')).toBeInTheDocument();
    });

    it('has aria-label on send button', () => {
      render(<ChatView {...baseProps} messages={sampleMessages} input="hello" />);

      expect(screen.getByRole('button', { name: 'Send message' })).toBeInTheDocument();
    });

    it('renders messages as articles with aria-labels', () => {
      render(<ChatView {...baseProps} messages={sampleMessages} />);

      const articles = screen.getAllByRole('article');
      expect(articles.length).toBeGreaterThanOrEqual(2);
    });
  });
});
