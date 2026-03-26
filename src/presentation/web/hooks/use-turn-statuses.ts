'use client';

import { useQuery } from '@tanstack/react-query';

export type TurnStatus = 'idle' | 'processing' | 'unread';

/**
 * Polls turn statuses for multiple feature/scope IDs.
 * Returns a map of featureId → TurnStatus for dot indicator rendering.
 *
 * Polls every 3 seconds to keep indicators responsive.
 */
export function useTurnStatuses(featureIds: string[]): Record<string, TurnStatus> {
  const sortedIds = [...featureIds].sort().join(',');

  const { data } = useQuery<Record<string, TurnStatus>>({
    queryKey: ['turn-statuses', sortedIds],
    queryFn: async () => {
      if (!sortedIds) return {};
      const res = await fetch(`/api/interactive/chat/turn-statuses?featureIds=${sortedIds}`);
      if (!res.ok) return {};
      return res.json();
    },
    refetchInterval: 3_000,
    enabled: featureIds.length > 0,
  });

  return data ?? {};
}

/**
 * Marks a feature's chat as read (clears 'unread' → 'idle').
 */
export async function markChatRead(featureId: string): Promise<void> {
  await fetch(`/api/interactive/chat/${featureId}/mark-read`, { method: 'POST' });
}
