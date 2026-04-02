'use client';

import { createContext, useContext, type ReactNode } from 'react';
import type { FabLayoutState } from '@/lib/fab-layout';

const defaultLayout: FabLayoutState = { swapPosition: false };

const FabLayoutContext = createContext<FabLayoutState>(defaultLayout);

interface FabLayoutProviderProps {
  children: ReactNode;
  layout: FabLayoutState;
}

/**
 * Provides server-resolved FAB layout configuration to all client components.
 * Initialized in the root layout with values from the DB singleton.
 */
export function FabLayoutProvider({ children, layout }: FabLayoutProviderProps) {
  return <FabLayoutContext.Provider value={layout}>{children}</FabLayoutContext.Provider>;
}

/**
 * Read FAB layout config from context. Returns default (not swapped)
 * when used outside a FabLayoutProvider (e.g., Storybook, tests).
 */
export function useFabLayout(): FabLayoutState {
  return useContext(FabLayoutContext);
}
