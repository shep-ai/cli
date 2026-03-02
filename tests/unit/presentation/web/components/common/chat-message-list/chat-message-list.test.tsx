import { describe, it, expect, vi, beforeAll } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ChatMessageList } from '@/components/common/chat-message-list';
import type { ChatMessage } from '@/components/common/chat-message-bubble';

// Mock scrollIntoView which doesn't exist in jsdom
beforeAll(() => {
  Element.prototype.scrollIntoView = vi.fn();
});

describe('ChatMessageList', () => {
  it('renders the correct number of message bubbles', () => {
    const messages: ChatMessage[] = [
      { role: 'user', content: 'Hello' },
      { role: 'assistant', content: 'Hi there' },
      { role: 'user', content: 'Another question' },
    ];
    render(<ChatMessageList messages={messages} />);

    expect(screen.getByText('Hello')).toBeInTheDocument();
    expect(screen.getByText('Hi there')).toBeInTheDocument();
    expect(screen.getByText('Another question')).toBeInTheDocument();
  });

  it('renders empty state when messages array is empty', () => {
    render(<ChatMessageList messages={[]} />);

    expect(
      screen.getByText('Ask questions about the decisions before approving or rejecting.')
    ).toBeInTheDocument();
  });

  it('has an ARIA live region for accessibility', () => {
    const messages: ChatMessage[] = [{ role: 'user', content: 'Test' }];
    render(<ChatMessageList messages={messages} />);

    const log = screen.getByRole('log');
    expect(log).toHaveAttribute('aria-live', 'polite');
  });

  it('auto-scrolls to bottom when messages change', () => {
    const scrollIntoViewMock = vi.fn();
    Element.prototype.scrollIntoView = scrollIntoViewMock;

    const messages: ChatMessage[] = [{ role: 'user', content: 'First' }];
    const { rerender } = render(<ChatMessageList messages={messages} />);

    const updatedMessages: ChatMessage[] = [
      ...messages,
      { role: 'assistant', content: 'Response' },
    ];
    rerender(<ChatMessageList messages={updatedMessages} />);

    expect(scrollIntoViewMock).toHaveBeenCalled();
  });

  it('does not render ARIA log region when empty', () => {
    render(<ChatMessageList messages={[]} />);

    expect(screen.queryByRole('log')).not.toBeInTheDocument();
  });
});
