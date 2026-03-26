'use client';

import { useRef, useCallback } from 'react';
import { Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface ChatInputProps {
  /** Called when the user submits a message (Enter key or send button). */
  onSubmit: (content: string) => void;
  /** Disables the input when the session is not in ready state. */
  disabled?: boolean;
  /** Placeholder text for the textarea. */
  placeholder?: string;
  className?: string;
}

/**
 * Chat input component for the interactive agent chat.
 *
 * - Enter key submits the message
 * - Shift+Enter inserts a newline
 * - Disabled state prevents all interaction
 * - Accessible via keyboard: tab to reach, Enter to send
 */
export function ChatInput({
  onSubmit,
  disabled = false,
  placeholder = 'Message the agent... (Enter to send, Shift+Enter for newline)',
  className,
}: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const content = textarea.value.trim();
    if (!content) return;

    onSubmit(content);
    textarea.value = '';
    // Reset height after clearing
    textarea.style.height = 'auto';
  }, [onSubmit]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit]
  );

  const handleInput = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const el = e.target;
    // Auto-resize textarea up to a max height
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, []);

  return (
    <div className={cn('bg-background flex items-end gap-2 border-t p-3', className)}>
      <textarea
        ref={textareaRef}
        rows={1}
        disabled={disabled}
        placeholder={placeholder}
        aria-label="Message input"
        onKeyDown={handleKeyDown}
        onChange={handleInput}
        className={cn(
          'bg-background min-h-[36px] flex-1 resize-none rounded-md border px-3 py-2 text-sm',
          'focus:ring-ring focus:ring-2 focus:ring-offset-0 focus:outline-none',
          'placeholder:text-muted-foreground',
          'disabled:cursor-not-allowed disabled:opacity-50',
          'max-h-40 overflow-y-auto'
        )}
      />
      <Button
        type="button"
        size="icon-sm"
        disabled={disabled}
        onClick={handleSubmit}
        aria-label="Send message"
        className="shrink-0"
      >
        <Send className="size-4" />
      </Button>
    </div>
  );
}
