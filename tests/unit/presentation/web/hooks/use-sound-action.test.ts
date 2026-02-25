import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';

/* ------------------------------------------------------------------ */
/*  Mock useSound                                                     */
/* ------------------------------------------------------------------ */

const mockPlay = vi.fn();
const mockStop = vi.fn();

vi.mock('../../../../../src/presentation/web/hooks/use-sound.js', () => ({
  useSound: vi.fn(() => ({
    play: mockPlay,
    stop: mockStop,
    isPlaying: false,
  })),
}));

/* ------------------------------------------------------------------ */
/*  Import after mocks                                                */
/* ------------------------------------------------------------------ */

import { useSound } from '../../../../../src/presentation/web/hooks/use-sound.js';
import {
  useSoundAction,
  SOUND_ACTION_MAP,
  type SoundAction,
} from '../../../../../src/presentation/web/hooks/use-sound-action.js';

describe('SOUND_ACTION_MAP', () => {
  it('contains exactly 22 action entries', () => {
    expect(Object.keys(SOUND_ACTION_MAP)).toHaveLength(22);
  });

  it('every entry has a sound string and a numeric volume between 0 and 1', () => {
    for (const [_action, entry] of Object.entries(SOUND_ACTION_MAP)) {
      expect(typeof entry.sound).toBe('string');
      expect(typeof entry.volume).toBe('number');
      expect(entry.volume).toBeGreaterThanOrEqual(0);
      expect(entry.volume).toBeLessThanOrEqual(1);
    }
  });

  it('volume hierarchy: navigate (0.2) < toggles (0.3) < drawers (0.4) < actions (0.5)', () => {
    expect(SOUND_ACTION_MAP.navigate.volume).toBe(0.2);
    expect(SOUND_ACTION_MAP['menu-item'].volume).toBe(0.2);

    expect(SOUND_ACTION_MAP.select.volume).toBe(0.3);
    expect(SOUND_ACTION_MAP['toggle-on'].volume).toBe(0.3);
    expect(SOUND_ACTION_MAP['toggle-off'].volume).toBe(0.3);
    expect(SOUND_ACTION_MAP.click.volume).toBe(0.3);

    expect(SOUND_ACTION_MAP['drawer-open'].volume).toBe(0.4);
    expect(SOUND_ACTION_MAP['drawer-close'].volume).toBe(0.4);
    expect(SOUND_ACTION_MAP.submit.volume).toBe(0.4);

    expect(SOUND_ACTION_MAP.approve.volume).toBe(0.5);
    expect(SOUND_ACTION_MAP.reject.volume).toBe(0.5);
    expect(SOUND_ACTION_MAP.create.volume).toBe(0.5);
    expect(SOUND_ACTION_MAP.delete.volume).toBe(0.5);
  });
});

describe('useSoundAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe.each([
    // Navigation (0.2)
    ['navigate', 'tap_01', 0.2],
    ['menu-item', 'tap_01', 0.2],
    // Toggles & selections (0.3)
    ['select', 'select', 0.3],
    ['toggle-on', 'toggle_on', 0.3],
    ['toggle-off', 'toggle_off', 0.3],
    ['click', 'tap_01', 0.3],
    ['cancel', 'transition_down', 0.3],
    ['expand', 'swipe', 0.3],
    ['collapse', 'swipe', 0.3],
    ['menu-open', 'select', 0.3],
    ['copy', 'select', 0.3],
    // Drawers & transitions (0.4)
    ['drawer-open', 'transition_up', 0.4],
    ['drawer-close', 'transition_down', 0.4],
    ['submit', 'button', 0.4],
    // Significant actions (0.5)
    ['approve', 'celebration', 0.5],
    ['reject', 'caution', 0.5],
    ['create', 'transition_up', 0.5],
    ['delete', 'transition_down', 0.5],
    ['notification-success', 'celebration', 0.5],
    ['notification-error', 'caution', 0.5],
    ['notification-warning', 'notification', 0.5],
    ['notification-info', 'button', 0.5],
  ] as [SoundAction, string, number][])('action "%s"', (action, expectedSound, expectedVolume) => {
    it(`delegates to useSound("${expectedSound}", { volume: ${expectedVolume} })`, () => {
      renderHook(() => useSoundAction(action));

      expect(useSound).toHaveBeenCalledWith(expectedSound, { volume: expectedVolume });
    });
  });

  it('returns play, stop, and isPlaying from useSound', () => {
    const { result } = renderHook(() => useSoundAction('approve'));

    expect(result.current.play).toBe(mockPlay);
    expect(result.current.stop).toBe(mockStop);
    expect(result.current.isPlaying).toBe(false);
  });

  it('play() delegates to the underlying useSound play()', () => {
    const { result } = renderHook(() => useSoundAction('navigate'));

    result.current.play();

    expect(mockPlay).toHaveBeenCalledOnce();
  });

  it('stop() delegates to the underlying useSound stop()', () => {
    const { result } = renderHook(() => useSoundAction('reject'));

    result.current.stop();

    expect(mockStop).toHaveBeenCalledOnce();
  });
});
