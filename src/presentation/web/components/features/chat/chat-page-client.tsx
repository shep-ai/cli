'use client';

import { useCallback, useState } from 'react';
import { useChat } from '@/hooks/use-chat';
import { ChatView } from './chat-view';

export function ChatPageClient() {
  const { messages, status, error, sendMessage, retry, clearChat } = useChat();
  const [input, setInput] = useState('');

  const isStreaming = status === 'sending' || status === 'streaming';

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
  }, [clearChat]);

  return (
    <div className="flex h-full flex-col">
      <ChatView
        messages={messages}
        input={input}
        onInputChange={setInput}
        onSubmit={handleSubmit}
        onSuggestionClick={handleSuggestionClick}
        onClear={handleClear}
        onRetry={retry}
        isStreaming={isStreaming}
      />
      {error ? (
        <div className="border-destructive bg-destructive/10 text-destructive mx-4 mb-2 rounded-md border px-3 py-2 text-sm">
          {error}
        </div>
      ) : null}
    </div>
  );
}
