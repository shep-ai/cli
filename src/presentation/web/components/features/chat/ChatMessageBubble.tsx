'use client';

import type { Components } from 'react-markdown';
import Markdown from 'react-markdown';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { InteractiveMessageRole } from '@shepai/core/domain/generated/output';

const markdownComponents: Components = {
  p: ({ children }) => <p className="mb-2 leading-relaxed last:mb-0">{children}</p>,
  strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
  em: ({ children }) => <em className="italic">{children}</em>,
  code: ({ children, className }) =>
    className ? (
      <code className={`${className} text-[11px]`}>{children}</code>
    ) : (
      <code className="bg-background/50 rounded-md px-1.5 py-0.5 font-mono text-xs">
        {children}
      </code>
    ),
  pre: ({ children }) => (
    <pre className="bg-background/50 my-2 overflow-x-auto rounded-md p-3 font-mono text-xs leading-relaxed">
      {children}
    </pre>
  ),
  ul: ({ children }) => <ul className="mb-2 list-disc ps-4 last:mb-0">{children}</ul>,
  ol: ({ children }) => <ol className="mb-2 list-decimal ps-4 last:mb-0">{children}</ol>,
  li: ({ children }) => <li className="mb-0.5">{children}</li>,
  h1: ({ children }) => <h1 className="mb-1 text-base font-bold">{children}</h1>,
  h2: ({ children }) => <h2 className="mb-1 text-sm font-bold">{children}</h2>,
  h3: ({ children }) => <h3 className="mb-1 text-sm font-semibold">{children}</h3>,
  a: ({ children, href }) => (
    <a href={href} className="text-blue-500 underline" target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  ),
  blockquote: ({ children }) => (
    <blockquote className="border-muted-foreground/30 my-1 border-s-2 ps-3 italic opacity-80">
      {children}
    </blockquote>
  ),
};

export interface ChatMessageBubbleProps {
  /** Role of the message author */
  role: InteractiveMessageRole;
  /** Full message content */
  content: string;
  /** When the message was created */
  timestamp?: Date | string;
  /** Whether this message is currently streaming (assistant only) */
  streaming?: boolean;
  className?: string;
}

function formatTime(ts: Date | string): string {
  try {
    const d = typeof ts === 'string' ? new Date(ts) : ts;
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

/**
 * Renders a single chat message bubble with full markdown support.
 *
 * - User messages: right-aligned, primary background
 * - Assistant messages: left-aligned, muted background, markdown rendered
 * - When streaming=true and role=assistant: trailing blinking cursor is shown
 */
export function ChatMessageBubble({
  role,
  content,
  timestamp,
  streaming = false,
  className,
}: ChatMessageBubbleProps) {
  const { t } = useTranslation('web');
  const isUser = role === InteractiveMessageRole.user;
  const timeStr = timestamp ? formatTime(timestamp) : null;

  return (
    <div
      className={cn('flex w-full flex-col', isUser ? 'items-end' : 'items-start', className)}
      aria-label={isUser ? t('chat.yourMessage') : t('chat.agentMessage')}
    >
      <div
        className={cn(
          'max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed',
          isUser
            ? 'bg-primary text-primary-foreground rounded-br-sm'
            : 'bg-muted text-foreground rounded-bl-sm'
        )}
      >
        {isUser ? (
          <span className="whitespace-pre-wrap">{content}</span>
        ) : (
          <Markdown components={markdownComponents}>{content}</Markdown>
        )}
        {streaming && !isUser ? (
          <span
            aria-label={t('chat.agentIsTyping')}
            className="ms-0.5 inline-block h-3.5 w-0.5 animate-pulse bg-current align-middle opacity-75"
          />
        ) : null}
      </div>
      {timeStr && !streaming ? (
        <span className="text-muted-foreground mt-0.5 px-1 text-[10px]">{timeStr}</span>
      ) : null}
    </div>
  );
}
