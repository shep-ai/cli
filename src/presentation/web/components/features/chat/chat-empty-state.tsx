'use client';

import { MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const SUGGESTIONS = [
  'What features are in progress?',
  'Help me plan a new feature',
  'Explain the project architecture',
  'What should I work on next?',
] as const;

export interface ChatEmptyStateProps {
  onSuggestionClick?: (suggestion: string) => void;
  className?: string;
}

export function ChatEmptyState({ onSuggestionClick, className }: ChatEmptyStateProps) {
  return (
    <div className={cn('flex flex-1 flex-col items-center justify-center gap-6 p-6', className)}>
      <div className="flex flex-col items-center gap-3">
        <div className="bg-muted flex h-12 w-12 items-center justify-center rounded-full">
          <MessageSquare className="text-muted-foreground h-6 w-6" />
        </div>
        <h2 className="text-xl font-semibold tracking-tight">Chat with Shep</h2>
        <p className="text-muted-foreground max-w-sm text-center text-sm">
          Ask me anything about your project
        </p>
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        {SUGGESTIONS.map((suggestion) => (
          <Button
            key={suggestion}
            variant="outline"
            size="sm"
            onClick={() => onSuggestionClick?.(suggestion)}
          >
            {suggestion}
          </Button>
        ))}
      </div>
    </div>
  );
}
