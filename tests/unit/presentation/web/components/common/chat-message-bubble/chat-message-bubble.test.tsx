import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ChatMessageBubble } from '@/components/common/chat-message-bubble';
import type { ChatMessage } from '@/components/common/chat-message-bubble';

describe('ChatMessageBubble', () => {
  it('renders user message with right-aligned styling', () => {
    const message: ChatMessage = { role: 'user', content: 'Hello agent' };
    render(<ChatMessageBubble message={message} />);

    const wrapper = screen.getByTestId('chat-message-user');
    expect(wrapper.className).toContain('justify-end');
    expect(screen.getByText('Hello agent')).toBeInTheDocument();
  });

  it('renders user message with primary background', () => {
    const message: ChatMessage = { role: 'user', content: 'Test message' };
    render(<ChatMessageBubble message={message} />);

    const wrapper = screen.getByTestId('chat-message-user');
    const bubble = wrapper.firstElementChild!;
    expect(bubble.className).toContain('bg-primary');
  });

  it('renders assistant message with left-aligned styling', () => {
    const message: ChatMessage = { role: 'assistant', content: 'Here is my response' };
    render(<ChatMessageBubble message={message} />);

    const wrapper = screen.getByTestId('chat-message-assistant');
    expect(wrapper.className).toContain('justify-start');
  });

  it('renders assistant message with muted background', () => {
    const message: ChatMessage = { role: 'assistant', content: 'Response text' };
    render(<ChatMessageBubble message={message} />);

    const wrapper = screen.getByTestId('chat-message-assistant');
    const bubble = wrapper.firstElementChild!;
    expect(bubble.className).toContain('bg-muted');
  });

  it('renders assistant message markdown as rendered HTML', () => {
    const message: ChatMessage = { role: 'assistant', content: '**bold text**' };
    render(<ChatMessageBubble message={message} />);

    // react-markdown renders **bold** as <strong>
    const strong = screen.getByText('bold text');
    expect(strong.tagName).toBe('STRONG');
  });

  it('renders system/error message with alert role and warning styling', () => {
    const message: ChatMessage = { role: 'system', content: 'Something went wrong' };
    render(<ChatMessageBubble message={message} />);

    const alert = screen.getByRole('alert');
    expect(alert).toBeInTheDocument();
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  it('renders user message as plain text (not through markdown)', () => {
    const message: ChatMessage = { role: 'user', content: '**not bold**' };
    render(<ChatMessageBubble message={message} />);

    // User messages render as plain text, not through markdown
    const textEl = screen.getByText('**not bold**');
    expect(textEl.tagName).toBe('P');
    // Should NOT have a <strong> tag
    expect(screen.queryByText('not bold', { selector: 'strong' })).not.toBeInTheDocument();
  });
});
