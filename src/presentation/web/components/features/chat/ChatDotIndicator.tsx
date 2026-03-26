'use client';

import type { TurnStatus } from '@/hooks/use-turn-statuses';

interface ChatDotIndicatorProps {
  status: TurnStatus;
  className?: string;
}

/**
 * Dot indicator for chat buttons showing agent activity state:
 * - idle: no dot (hidden)
 * - processing: pulsing blue dot
 * - unread: static green dot
 * - awaiting_input: pulsing amber dot (agent needs user response)
 */
export function ChatDotIndicator({ status, className = '' }: ChatDotIndicatorProps) {
  if (status === 'idle') return null;

  const dotClass =
    status === 'awaiting_input'
      ? 'h-2.5 w-2.5 animate-pulse bg-amber-500'
      : status === 'processing'
        ? 'h-2.5 w-2.5 animate-pulse bg-blue-500'
        : 'h-2 w-2 bg-green-500';

  return (
    <span
      className={`absolute -top-0.5 -right-0.5 block rounded-full ${dotClass} ${className}`}
    />
  );
}
