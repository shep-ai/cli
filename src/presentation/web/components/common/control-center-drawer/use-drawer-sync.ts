'use client';

import { useEffect, useRef, useCallback } from 'react';
import { getFeatureDrawerData } from '@/app/actions/get-feature-drawer-data';
import type { FeatureNodeData } from '@/components/common/feature-node';
import { deriveInitialTab } from './drawer-view';
import type { DrawerView } from './drawer-view';

/** How often (ms) to run a background sync while the drawer is open. */
const BACKGROUND_SYNC_INTERVAL_MS = 15_000;

/**
 * Targeted drawer data synchronization — replaces router.refresh() for
 * keeping the feature drawer in sync with the server.
 *
 * - On drawer open: fetches fresh FeatureNodeData via server action
 * - Background sync: every 15s while open, merges fresh data into view
 * - SSE-driven state/lifecycle updates are handled separately (not here)
 * - Never affects form state (chatInput, prdSelections, attachments)
 */
export function useDrawerSync(
  isOpen: boolean,
  featureId: string | null,
  setView: React.Dispatch<React.SetStateAction<DrawerView>>
): void {
  const wasOpenRef = useRef(isOpen);
  const isFetchingRef = useRef(false);

  const syncFromServer = useCallback(async () => {
    if (!featureId || isFetchingRef.current) return;
    isFetchingRef.current = true;
    try {
      const data = await getFeatureDrawerData(featureId);
      if (!data) return;
      setView((prev) => mergeFeatureData(prev, data));
    } catch {
      // Silent — background sync failure is non-critical
    } finally {
      isFetchingRef.current = false;
    }
  }, [featureId, setView]);

  // On drawer open: fetch fresh data (replaces router.refresh() on open)
  useEffect(() => {
    if (isOpen && !wasOpenRef.current) {
      void syncFromServer();
    }
    wasOpenRef.current = isOpen;
  }, [isOpen, syncFromServer]);

  // Background sync: throttled interval while drawer is open
  useEffect(() => {
    if (!isOpen || !featureId) return;

    const timer = setInterval(() => {
      void syncFromServer();
    }, BACKGROUND_SYNC_INTERVAL_MS);

    return () => clearInterval(timer);
  }, [isOpen, featureId, syncFromServer]);
}

/**
 * Merges fresh server data into the current drawer view.
 * Preserves the view type and only updates the feature node data,
 * keeping all client-side state (form inputs, selections) untouched.
 */
function mergeFeatureData(prev: DrawerView, freshData: FeatureNodeData): DrawerView {
  if (prev.type !== 'feature') return prev;

  const merged: FeatureNodeData = { ...prev.node, ...freshData };
  return {
    ...prev,
    node: merged,
    initialTab: deriveInitialTab(merged),
  };
}
