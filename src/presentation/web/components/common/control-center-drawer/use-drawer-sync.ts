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
  // Incremented on every open transition — stale fetches from a previous
  // open/close cycle are discarded so they can't overwrite fresh data.
  const generationRef = useRef(0);

  const syncFromServer = useCallback(async () => {
    if (!featureId || isFetchingRef.current) return;
    isFetchingRef.current = true;
    const gen = generationRef.current;
    try {
      const data = await getFeatureDrawerData(featureId);
      if (!data) return;
      // Discard result if the drawer was closed and reopened while fetching
      if (gen !== generationRef.current) return;
      setView((prev) => mergeFeatureData(prev, data));
    } catch {
      // Silent — background sync failure is non-critical
    } finally {
      isFetchingRef.current = false;
    }
  }, [featureId, setView]);

  // Fetch full data when drawer opens (either on mount or closed→open transition).
  // The server component only provides minimal data (feature + agent run);
  // expensive fields (repo name, remote URL, CI status, etc.) are loaded here.
  const hasFetchedOnMountRef = useRef(false);
  useEffect(() => {
    if (isOpen && (!wasOpenRef.current || !hasFetchedOnMountRef.current)) {
      hasFetchedOnMountRef.current = true;
      // New open transition — bump generation to invalidate any in-flight fetch
      // from a previous cycle and reset the fetching guard.
      generationRef.current += 1;
      isFetchingRef.current = false;
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

  // Only re-derive initialTab when state or lifecycle actually changed.
  // Re-deriving on every background sync would reset the chat input
  // (which clears on initialTab change) even when nothing meaningful changed.
  const tabChanged = merged.state !== prev.node.state || merged.lifecycle !== prev.node.lifecycle;

  return {
    ...prev,
    node: merged,
    initialTab: tabChanged ? deriveInitialTab(merged) : prev.initialTab,
  };
}
