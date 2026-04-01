/**
 * FAB layout configuration for the web UI.
 *
 * Reads from Settings.fabLayout when available, defaulting to
 * swapPosition = false (Create FAB on start side, Chat FAB on end side).
 */

import { hasSettings, getSettings } from '@shepai/core/infrastructure/services/settings.service';

export interface FabLayoutState {
  swapPosition: boolean;
}

export function getFabLayout(): FabLayoutState {
  try {
    if (hasSettings()) {
      const fabLayout = getSettings().fabLayout;
      if (fabLayout) {
        return { swapPosition: fabLayout.swapPosition };
      }
    }
  } catch {
    // Settings not initialized (e.g., during build/SSG or client-side hydration)
  }

  return { swapPosition: false };
}
