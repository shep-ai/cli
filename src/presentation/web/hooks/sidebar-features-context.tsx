'use client';

import { createContext, useContext, useState, useMemo, type ReactNode } from 'react';
import type { FeatureNodeState } from '@/components/common/feature-node/feature-node-state-config';
import type { FeatureStatus } from '@/components/common/feature-status-config';

// Re-export the FeatureItem type so consumers can import from one place.
// This will gain `featureId` in a later phase.
export interface SidebarFeatureItem {
  name: string;
  status: FeatureStatus;
  featureId: string;
  startedAt?: number;
  duration?: string;
}

// ---------------------------------------------------------------------------
// Pure mapping: FeatureNodeState (6-state) → FeatureStatus (3-state) | null
// ---------------------------------------------------------------------------

const stateMapping: Record<FeatureNodeState, FeatureStatus | null> = {
  'action-required': 'action-needed',
  running: 'in-progress',
  done: 'done',
  blocked: 'in-progress',
  error: 'in-progress',
  creating: null,
};

/**
 * Maps a canvas FeatureNodeState to the sidebar's 3-state FeatureStatus.
 * Returns `null` for `creating` (optimistic UI) — these should be excluded from the sidebar.
 */
export function mapNodeStateToSidebarStatus(state: FeatureNodeState): FeatureStatus | null {
  return stateMapping[state];
}

// ---------------------------------------------------------------------------
// SidebarFeaturesContext
// ---------------------------------------------------------------------------

interface SidebarFeaturesContextValue {
  features: SidebarFeatureItem[];
  setFeatures: (features: SidebarFeatureItem[]) => void;
}

const SidebarFeaturesContext = createContext<SidebarFeaturesContextValue | null>(null);

interface SidebarFeaturesProviderProps {
  children: ReactNode;
}

export function SidebarFeaturesProvider({ children }: SidebarFeaturesProviderProps) {
  const [features, setFeatures] = useState<SidebarFeatureItem[]>([]);

  const value = useMemo<SidebarFeaturesContextValue>(() => ({ features, setFeatures }), [features]);

  return (
    <SidebarFeaturesContext.Provider value={value}>{children}</SidebarFeaturesContext.Provider>
  );
}

export function useSidebarFeaturesContext(): SidebarFeaturesContextValue {
  const ctx = useContext(SidebarFeaturesContext);
  if (!ctx) {
    throw new Error('useSidebarFeaturesContext must be used within a <SidebarFeaturesProvider>');
  }
  return ctx;
}
