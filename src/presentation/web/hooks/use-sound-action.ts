'use client';

import { useSound, type SoundName } from './use-sound';
import type { UseSoundResult } from './use-sound';

/* ------------------------------------------------------------------ */
/*  Sound Action Map — single source of truth for action → sound      */
/* ------------------------------------------------------------------ */

/** Maps semantic UI actions to their sound name and volume. */
export const SOUND_ACTION_MAP = {
  // Navigation (volume 0.2) — subtle taps for frequent interactions
  navigate: { sound: 'tap_01', volume: 0.2 },
  'menu-item': { sound: 'tap_01', volume: 0.2 },

  // Toggles & selections (volume 0.3) — moderate feedback
  select: { sound: 'select', volume: 0.3 },
  'toggle-on': { sound: 'toggle_on', volume: 0.3 },
  'toggle-off': { sound: 'toggle_off', volume: 0.3 },
  click: { sound: 'tap_01', volume: 0.3 },
  cancel: { sound: 'transition_down', volume: 0.3 },
  expand: { sound: 'swipe', volume: 0.3 },
  collapse: { sound: 'swipe', volume: 0.3 },
  'menu-open': { sound: 'select', volume: 0.3 },
  copy: { sound: 'select', volume: 0.3 },

  // Drawers & transitions (volume 0.4) — noticeable transitions
  'drawer-open': { sound: 'transition_up', volume: 0.4 },
  'drawer-close': { sound: 'transition_down', volume: 0.4 },
  submit: { sound: 'button', volume: 0.4 },

  // Significant actions (volume 0.5) — prominent feedback
  approve: { sound: 'celebration', volume: 0.5 },
  reject: { sound: 'caution', volume: 0.5 },
  create: { sound: 'transition_up', volume: 0.5 },
  delete: { sound: 'transition_down', volume: 0.5 },
  'notification-success': { sound: 'celebration', volume: 0.5 },
  'notification-error': { sound: 'caution', volume: 0.5 },
  'notification-warning': { sound: 'notification', volume: 0.5 },
  'notification-info': { sound: 'button', volume: 0.5 },
} as const satisfies Record<string, { sound: SoundName; volume: number }>;

/** Union of all semantic action names available in the sound system. */
export type SoundAction = keyof typeof SOUND_ACTION_MAP;

/**
 * Returns `{ play, stop, isPlaying }` for the given semantic action.
 * Sound name and volume are resolved from `SOUND_ACTION_MAP`.
 */
export function useSoundAction(action: SoundAction): UseSoundResult {
  const { sound, volume } = SOUND_ACTION_MAP[action];
  return useSound(sound, { volume });
}
