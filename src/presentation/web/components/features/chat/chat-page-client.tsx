'use client';

import { useCallback, useState } from 'react';
import { ChatView, type ChatMessage } from './chat-view';

export function ChatPageClient() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');

  const handleSubmit = useCallback(() => {
    const trimmed = input.trim();
    if (!trimmed) return;

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: trimmed,
      timestamp: new Date(),
      status: 'complete',
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
  }, [input]);

  const handleSuggestionClick = useCallback((suggestion: string) => {
    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: suggestion,
      timestamp: new Date(),
      status: 'complete',
    };

    setMessages((prev) => [...prev, userMessage]);
  }, []);

  const handleClear = useCallback(() => {
    setMessages([]);
    setInput('');
  }, []);

  return (
    <div className="flex h-full flex-col">
      <ChatView
        messages={messages}
        input={input}
        onInputChange={setInput}
        onSubmit={handleSubmit}
        onSuggestionClick={handleSuggestionClick}
        onClear={handleClear}
      />
    </div>
  );
}
