import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { ChatPageClient } from '@/components/features/chat/chat-page-client';

// --- Mocks ---

const mockSendMessage = vi.fn();
const mockRetry = vi.fn();
const mockClearChat = vi.fn();

let mockHookReturn = {
  messages: [] as {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
    status: 'sending' | 'streaming' | 'complete' | 'error';
  }[],
  status: 'idle' as 'idle' | 'sending' | 'streaming' | 'error',
  error: null as string | null,
  sendMessage: mockSendMessage,
  retry: mockRetry,
  clearChat: mockClearChat,
};

vi.mock('@/hooks/use-chat', () => ({
  useChat: () => mockHookReturn,
}));

const mockToastError = vi.fn();
vi.mock('sonner', () => ({
  toast: Object.assign(vi.fn(), {
    error: (...args: unknown[]) => mockToastError(...args),
  }),
}));

describe('ChatPageClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHookReturn = {
      messages: [],
      status: 'idle',
      error: null,
      sendMessage: mockSendMessage,
      retry: mockRetry,
      clearChat: mockClearChat,
    };
  });

  it('renders the chat view with empty state initially', () => {
    render(<ChatPageClient />);

    expect(screen.getByText('Chat with Shep')).toBeInTheDocument();
  });

  it('calls sendMessage when a message is submitted', () => {
    mockSendMessage.mockResolvedValue(undefined);
    render(<ChatPageClient />);

    const input = screen.getByLabelText('Chat message input');
    fireEvent.change(input, { target: { value: 'Hello world' } });

    const sendButton = screen.getByRole('button', { name: 'Send message' });
    fireEvent.click(sendButton);

    expect(mockSendMessage).toHaveBeenCalledWith('Hello world');
  });

  it('does not call sendMessage with empty input', () => {
    render(<ChatPageClient />);

    const sendButton = screen.getByRole('button', { name: 'Send message' });
    fireEvent.click(sendButton);

    expect(mockSendMessage).not.toHaveBeenCalled();
  });

  it('disables send button when streaming', () => {
    mockHookReturn.status = 'streaming';
    render(<ChatPageClient />);

    const sendButton = screen.getByRole('button', { name: 'Send message' });
    expect(sendButton).toBeDisabled();
  });

  it('calls sendMessage when suggestion chip is clicked', () => {
    mockSendMessage.mockResolvedValue(undefined);
    render(<ChatPageClient />);

    fireEvent.click(screen.getByText('What features are in progress?'));

    expect(mockSendMessage).toHaveBeenCalledWith('What features are in progress?');
  });

  it('calls clearChat when clear button is confirmed', () => {
    mockHookReturn.messages = [
      {
        id: '1',
        role: 'user',
        content: 'Hello',
        timestamp: new Date(),
        status: 'complete',
      },
    ];

    render(<ChatPageClient />);

    // Click the trash button to open the dialog
    fireEvent.click(screen.getByRole('button', { name: 'Clear conversation' }));

    // Click the Clear button in the dialog
    const clearButton = screen.getByRole('button', { name: 'Clear' });
    fireEvent.click(clearButton);

    expect(mockClearChat).toHaveBeenCalledTimes(1);
  });

  it('fires toast error when error state is set', () => {
    mockHookReturn.error = 'Agent connection failed';

    render(<ChatPageClient />);

    expect(mockToastError).toHaveBeenCalledWith('Chat error', {
      description: 'Agent connection failed',
    });
  });

  it('displays inline error alert when error is set', () => {
    mockHookReturn.error = 'Something went wrong';
    mockHookReturn.messages = [
      {
        id: '1',
        role: 'user',
        content: 'Hello',
        timestamp: new Date(),
        status: 'complete',
      },
    ];

    render(<ChatPageClient />);

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  it('calls retry when retry button in error alert is clicked', () => {
    mockHookReturn.error = 'Network error';
    mockHookReturn.status = 'error';
    mockHookReturn.messages = [
      {
        id: '1',
        role: 'user',
        content: 'Hello',
        timestamp: new Date(),
        status: 'complete',
      },
    ];

    render(<ChatPageClient />);

    const retryButton = screen.getByRole('button', { name: 'Retry last message' });
    fireEvent.click(retryButton);

    expect(mockRetry).toHaveBeenCalledTimes(1);
  });

  it('shows messages when they exist', () => {
    mockHookReturn.messages = [
      {
        id: '1',
        role: 'user',
        content: 'Test message',
        timestamp: new Date(),
        status: 'complete',
      },
      {
        id: '2',
        role: 'assistant',
        content: 'Test response',
        timestamp: new Date(),
        status: 'complete',
      },
    ];

    render(<ChatPageClient />);

    expect(screen.getByText('Test message')).toBeInTheDocument();
    expect(screen.getByText(/Test response/)).toBeInTheDocument();
    expect(screen.queryByText('Chat with Shep')).not.toBeInTheDocument();
  });

  it('re-enables input after streaming completes', () => {
    // Start in streaming state
    mockHookReturn.status = 'streaming';
    const { rerender } = render(<ChatPageClient />);

    const sendButton = screen.getByRole('button', { name: 'Send message' });
    expect(sendButton).toBeDisabled();

    // Transition to idle
    mockHookReturn.status = 'idle';
    act(() => {
      rerender(<ChatPageClient />);
    });

    // Input should be available again (button depends on input content)
    const input = screen.getByLabelText('Chat message input');
    expect(input).not.toBeDisabled();
  });
});
