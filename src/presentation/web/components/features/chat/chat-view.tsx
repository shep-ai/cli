'use client';

import { AlertCircle, RotateCcw, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  ChatContainerRoot,
  ChatContainerContent,
  ChatContainerScrollAnchor,
} from '@/components/ui/chat-container';
import { Message, MessageAvatar, MessageContent } from '@/components/ui/message';
import {
  PromptInput,
  PromptInputTextarea,
  PromptInputActions,
  PromptInputAction,
} from '@/components/ui/prompt-input';
import { Loader } from '@/components/ui/loader';
import { ChatEmptyState } from './chat-empty-state';
import { ChatHeader } from './chat-header';
import { cn } from '@/lib/utils';

export type ChatMessageStatus = 'sending' | 'streaming' | 'complete' | 'error';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  status?: ChatMessageStatus;
}

export interface ChatViewProps {
  messages: ChatMessage[];
  input: string;
  onInputChange: (value: string) => void;
  onSubmit: () => void;
  onSuggestionClick?: (suggestion: string) => void;
  onClear?: () => void;
  onRetry?: () => void;
  isStreaming?: boolean;
  disabled?: boolean;
  error?: string | null;
  inputRef?: React.RefObject<HTMLTextAreaElement | null>;
  className?: string;
}

export function ChatView({
  messages,
  input,
  onInputChange,
  onSubmit,
  onSuggestionClick,
  onClear,
  onRetry,
  isStreaming = false,
  disabled = false,
  error,
  inputRef,
  className,
}: ChatViewProps) {
  const isEmpty = messages.length === 0;
  const lastMessage = messages[messages.length - 1];
  const showThinking =
    isStreaming && lastMessage?.role === 'user' && lastMessage?.status !== 'error';

  return (
    <div className={cn('flex h-full flex-col', className)}>
      <ChatHeader onClear={onClear} isStreaming={isStreaming} />

      {isEmpty ? (
        <ChatEmptyState onSuggestionClick={onSuggestionClick} />
      ) : (
        <ChatContainerRoot className="flex-1" aria-label="Chat messages">
          <ChatContainerContent className="gap-4 p-4">
            <div aria-live="polite" aria-atomic="false" className="contents">
              {messages.map((message) => (
                <Message
                  key={message.id}
                  className={message.role === 'user' ? 'flex-row-reverse' : ''}
                  role="article"
                  aria-label={`${message.role === 'user' ? 'You' : 'Shep'}: ${message.content.slice(0, 80)}`}
                >
                  <MessageAvatar
                    src={message.role === 'assistant' ? '/shep-avatar.svg' : ''}
                    alt={message.role === 'assistant' ? 'Shep' : 'You'}
                    fallback={message.role === 'assistant' ? 'S' : 'U'}
                  />
                  <div className="flex max-w-[80%] flex-col gap-1">
                    <MessageContent
                      markdown={message.role === 'assistant'}
                      className={cn(
                        message.role === 'user' && 'bg-primary text-primary-foreground'
                      )}
                    >
                      {message.content}
                    </MessageContent>
                    {message.status === 'error' && onRetry ? (
                      <Button
                        variant="ghost"
                        size="xs"
                        onClick={onRetry}
                        className="self-start"
                        aria-label="Retry sending message"
                      >
                        <RotateCcw className="mr-1 h-3 w-3" />
                        Retry
                      </Button>
                    ) : null}
                  </div>
                </Message>
              ))}
            </div>
            {showThinking ? (
              <Message role="article" aria-label="Shep is thinking">
                <MessageAvatar src="/shep-avatar.svg" alt="Shep" fallback="S" />
                <div className="bg-secondary flex items-center rounded-lg p-3">
                  <Loader variant="typing" size="sm" />
                </div>
              </Message>
            ) : null}
            {error && !isStreaming ? (
              <div
                className="border-destructive bg-destructive/10 mx-auto flex max-w-md items-center gap-2 rounded-md border px-3 py-2 text-sm"
                role="alert"
              >
                <AlertCircle className="text-destructive h-4 w-4 shrink-0" />
                <span className="text-destructive flex-1">{error}</span>
                {onRetry ? (
                  <Button
                    variant="ghost"
                    size="xs"
                    onClick={onRetry}
                    aria-label="Retry last message"
                  >
                    <RotateCcw className="mr-1 h-3 w-3" />
                    Retry
                  </Button>
                ) : null}
              </div>
            ) : null}
            <ChatContainerScrollAnchor />
          </ChatContainerContent>
        </ChatContainerRoot>
      )}

      <div className="border-t p-4">
        <PromptInput
          value={input}
          onValueChange={onInputChange}
          onSubmit={onSubmit}
          isLoading={isStreaming}
          disabled={disabled}
        >
          <PromptInputTextarea
            placeholder="Type a message..."
            aria-label="Chat message input"
            ref={inputRef}
          />
          <PromptInputActions className="justify-end px-2 pb-2">
            <PromptInputAction tooltip="Send message">
              <Button
                variant="default"
                size="icon-sm"
                disabled={!input.trim() || isStreaming || disabled}
                onClick={onSubmit}
                aria-label="Send message"
              >
                <Send className="h-4 w-4" />
              </Button>
            </PromptInputAction>
          </PromptInputActions>
        </PromptInput>
      </div>
    </div>
  );
}
