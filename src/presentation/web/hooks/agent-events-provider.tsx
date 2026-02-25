'use client';

import { createContext, useContext, type ReactNode } from 'react';
import {
  useAgentEvents,
  type UseAgentEventsOptions,
  type UseAgentEventsResult,
} from './use-agent-events';

const AgentEventsContext = createContext<UseAgentEventsResult | null>(null);

interface AgentEventsProviderProps extends UseAgentEventsOptions {
  children: ReactNode;
}

/**
 * Single SSE connection for agent events shared across all consumers.
 * Wrap the app once; use `useAgentEventsContext()` to read.
 */
export function AgentEventsProvider({ children, runId }: AgentEventsProviderProps) {
  const value = useAgentEvents({ runId });

  return <AgentEventsContext.Provider value={value}>{children}</AgentEventsContext.Provider>;
}

export function useAgentEventsContext(): UseAgentEventsResult {
  const ctx = useContext(AgentEventsContext);
  if (!ctx) {
    throw new Error('useAgentEventsContext must be used within an <AgentEventsProvider>');
  }
  return ctx;
}
