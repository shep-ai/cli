'use client';

import { useQuery } from '@tanstack/react-query';

export type TurnStatus = 'idle' | 'processing' | 'unread';

/**
 * Polls ALL active turn statuses from the backend.
 * No IDs needed — the backend returns every non-idle session status.
 * Returns a map of scopeId → TurnStatus.
 */
export function useAllTurnStatuses(): Record<string, TurnStatus> {
  const { data } = useQuery<Record<string, TurnStatus>>({
    queryKey: ['turn-statuses'],
    queryFn: async () => {
      const res = await fetch('/api/interactive/chat/turn-statuses');
      if (!res.ok) return {};
      return res.json();
    },
    refetchInterval: 5_000,
  });

  return data ?? {};
}

/**
 * Marks a feature's chat as read (clears 'unread' → 'idle').
 */
export async function markChatRead(featureId: string): Promise<void> {
  await fetch(`/api/interactive/chat/${featureId}/mark-read`, { method: 'POST' });
}
