'use client';

import { useEffect, useRef } from 'react';
import { MessageSquare } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChatMessageBubble } from '@/components/common/chat-message-bubble';
import type { ChatMessageListProps } from './chat-message-list-config';

export function ChatMessageList({ messages, isStreaming = false }: ChatMessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isStreaming]);

  if (messages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-6 text-center">
        <MessageSquare className="text-muted-foreground/50 h-6 w-6" />
        <p className="text-muted-foreground text-xs">
          Ask questions about the decisions before approving or rejecting.
        </p>
      </div>
    );
  }

  return (
    <ScrollArea className="max-h-[300px]">
      <div className="space-y-3 p-3" role="log" aria-live="polite" aria-label="Chat messages">
        {messages.map((message, index) => (
          <ChatMessageBubble key={index} message={message} />
        ))}
        <div ref={bottomRef} />
      </div>
    </ScrollArea>
  );
}
