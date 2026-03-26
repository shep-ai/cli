'use client';

import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useTurnStatuses, type TurnStatus } from './use-turn-statuses';

interface TurnStatusesContextValue {
  /** Get turn status for a scope key (featureId / "repo-<id>" / "global") */
  getStatus: (scopeId: string) => TurnStatus;
}

const TurnStatusesContext = createContext<TurnStatusesContextValue>({
  getStatus: () => 'idle',
});

interface TurnStatusesProviderProps {
  /** All scope IDs to poll turn statuses for */
  scopeIds: string[];
  children: ReactNode;
}

/**
 * Polls turn statuses for all provided scope IDs in a single API call.
 * Children use `useTurnStatus(scopeId)` to read individual statuses.
 */
export function TurnStatusesProvider({ scopeIds, children }: TurnStatusesProviderProps) {
  const statuses = useTurnStatuses(scopeIds);

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
