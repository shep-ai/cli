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
 */
export function ChatDotIndicator({ status, className = '' }: ChatDotIndicatorProps) {
  if (status === 'idle') return null;

  return (
    <span
      className={`absolute -top-0.5 -right-0.5 block rounded-full ${
        status === 'processing' ? 'h-2.5 w-2.5 animate-pulse bg-blue-500' : 'h-2 w-2 bg-green-500'
      } ${className}`}
    />
  );
}
