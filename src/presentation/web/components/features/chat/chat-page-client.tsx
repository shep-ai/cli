'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useChat } from '@/hooks/use-chat';
import { ChatView } from './chat-view';

export function ChatPageClient() {
  const { messages, status, error, sendMessage, retry, clearChat } = useChat();
  const [input, setInput] = useState('');
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const prevStatusRef = useRef(status);

  const isStreaming = status === 'sending' || status === 'streaming';

  // Auto-focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Re-focus input after streaming completes or on error
  useEffect(() => {
    const prevStatus = prevStatusRef.current;
    prevStatusRef.current = status;

    if (
      (prevStatus === 'streaming' || prevStatus === 'sending') &&
      (status === 'idle' || status === 'error')
    ) {
      inputRef.current?.focus();
    }
  }, [status]);

  // Show toast on error
  useEffect(() => {
    if (error) {
      toast.error('Chat error', { description: error });
    }
  }, [error]);

  const handleSubmit = useCallback(() => {
    const trimmed = input.trim();
    if (!trimmed || isStreaming) return;

    void sendMessage(trimmed);
    setInput('');
  }, [input, isStreaming, sendMessage]);

  const handleSuggestionClick = useCallback(
    (suggestion: string) => {
      if (isStreaming) return;
      void sendMessage(suggestion);
    },
    [isStreaming, sendMessage]
  );

  const handleClear = useCallback(() => {
    clearChat();
    setInput('');
    inputRef.current?.focus();
  }, [clearChat]);

  return (
    <ChatView
      messages={messages}
      input={input}
      onInputChange={setInput}
      onSubmit={handleSubmit}
      onSuggestionClick={handleSuggestionClick}
      onClear={handleClear}
      onRetry={retry}
      isStreaming={isStreaming}
      error={error}
      inputRef={inputRef}
    />
  );
}
