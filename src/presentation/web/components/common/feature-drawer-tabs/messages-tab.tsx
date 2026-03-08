'use client';

import { Loader2, AlertCircle, MessageSquare } from 'lucide-react';
import type { MessageData } from '@/app/actions/get-feature-messages';

export interface MessagesTabProps {
  messages: MessageData[] | null;
  loading: boolean;
  error: string | null;
}

export function MessagesTab({ messages, loading, error }: MessagesTabProps) {
  if (loading) {
    return (
      <div data-testid="messages-tab-loading" className="flex items-center justify-center p-8">
        <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 p-4 text-sm text-red-600">
        <AlertCircle className="h-4 w-4 shrink-0" />
        <span>{error}</span>
      </div>
    );
  }

  if (!messages || messages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 p-8">
        <MessageSquare className="text-muted-foreground h-8 w-8" />
        <p className="text-muted-foreground text-sm">No messages yet</p>
      </div>
    );
  }

  return (
    <div data-testid="messages-list" className="flex flex-col gap-3 p-4">
      {messages.map((msg, index) => (
        // eslint-disable-next-line react/no-array-index-key -- messages are append-only, never reorder
        <MessageItem key={`msg-${index}`} message={msg} />
      ))}
    </div>
  );
}

function MessageItem({ message }: { message: MessageData }) {
  const isAssistant = message.role === 'assistant';

  return (
    <div
      data-testid={`message-${message.role}`}
      className={`flex flex-col gap-1.5 rounded-lg px-3 py-2 ${
        isAssistant ? 'bg-muted/50' : 'border-primary/20 border-l-2 pl-3'
      }`}
    >
      <span
        className={`text-xs font-medium ${isAssistant ? 'text-muted-foreground' : 'text-primary'}`}
      >
        {message.role}
      </span>
      <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
      {message.options && message.options.length > 0 ? (
        <div className="mt-1 flex flex-col gap-1">
          <span className="text-muted-foreground text-xs font-medium">Options:</span>
          <ul className="flex flex-col gap-0.5">
            {message.options.map((option, idx) => {
              const isSelected = message.selectedOption === idx;
              return (
                <li
                  // eslint-disable-next-line react/no-array-index-key -- options are static, never reorder
                  key={`option-${idx}`}
                  className={`text-xs ${isSelected ? 'font-medium text-emerald-600' : 'text-muted-foreground'}`}
                >
                  {isSelected ? '✓ ' : '○ '}
                  {option}
                </li>
              );
            })}
          </ul>
          {message.answer ? (
            <span className="mt-0.5 text-xs font-medium text-emerald-600">
              Answer: {message.answer}
            </span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
