'use client';

import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useAllTurnStatuses, type TurnStatus } from './use-turn-statuses';

interface TurnStatusesContextValue {
  /** Get turn status for a scope key (featureId / "repo-<id>" / "global") */
  getStatus: (scopeId: string) => TurnStatus;
}

const TurnStatusesContext = createContext<TurnStatusesContextValue>({
  getStatus: () => 'idle',
});

/**
 * Polls ALL active turn statuses in a single API call (no IDs needed).
 * Children use `useTurnStatus(scopeId)` to read individual statuses.
 */
export function TurnStatusesProvider({ children }: { children: ReactNode }) {
  const statuses = useAllTurnStatuses();

  const value = useMemo<TurnStatusesContextValue>(
    () => ({
      getStatus: (scopeId: string) => (statuses[scopeId] as TurnStatus) ?? 'idle',
    }),
    [statuses]
  );

  return <TurnStatusesContext.Provider value={value}>{children}</TurnStatusesContext.Provider>;
}

/**
 * Get the turn status for a specific scope ID.
 * Must be used within a TurnStatusesProvider.
 */
export function useTurnStatus(scopeId: string): TurnStatus {
  const ctx = useContext(TurnStatusesContext);
  return ctx.getStatus(scopeId);
}
