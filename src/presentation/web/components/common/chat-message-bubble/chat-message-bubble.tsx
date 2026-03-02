'use client';

import Markdown from 'react-markdown';
import { AlertTriangle } from 'lucide-react';
import { markdownComponents } from '@/lib/markdown-components';
import type { ChatMessageBubbleProps } from './chat-message-bubble-config';

export function ChatMessageBubble({ message }: ChatMessageBubbleProps) {
  const { role, content } = message;

  if (role === 'system') {
    return (
      <div className="flex items-start gap-2 px-1" role="alert">
        <AlertTriangle className="text-destructive mt-0.5 h-3.5 w-3.5 shrink-0" />
        <p className="text-destructive text-xs">{content}</p>
      </div>
    );
  }

  const isUser = role === 'user';

  return (
    <div
      className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
      data-testid={`chat-message-${role}`}
    >
      <div
        className={`max-w-[85%] rounded-lg px-3 py-2 ${
          isUser ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground'
        }`}
      >
        {isUser ? (
          <p className="text-xs leading-relaxed">{content}</p>
        ) : (
          <Markdown components={markdownComponents}>{content}</Markdown>
        )}
      </div>
    </div>
  );
}
