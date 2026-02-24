'use client';

import { useCallback, useEffect, useRef } from 'react';

const SOUND_NAMES = [
  'button',
  'caution',
  'celebration',
  'disabled',
  'notification',
  'progress_loop',
  'ringtone_loop',
  'select',
  'swipe',
  'swipe_01',
  'swipe_02',
  'swipe_03',
  'swipe_04',
  'swipe_05',
  'tap_01',
  'tap_02',
  'tap_03',
  'tap_04',
  'tap_05',
  'toggle_off',
  'toggle_on',
  'transition_down',
  'transition_up',
  'type_01',
  'type_02',
  'type_03',
  'type_04',
  'type_05',
] as const;

export type SoundName = (typeof SOUND_NAMES)[number];

export interface UseSoundOptions {
  volume?: number;
  loop?: boolean;
}

export interface UseSoundResult {
  play: () => void;
  stop: () => void;
  isPlaying: boolean;
}

export function useSound(name: SoundName, options: UseSoundOptions = {}): UseSoundResult {
  const { volume = 1, loop = false } = options;
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const isPlayingRef = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const audio = new Audio(`/sounds/${name}.wav`);
    audio.preload = 'auto';
    audio.loop = loop;
    audio.volume = Math.max(0, Math.min(1, volume));
    audio.addEventListener('ended', () => {
      isPlayingRef.current = false;
    });
    audioRef.current = audio;

    return () => {
      audio.pause();
      audio.removeAttribute('src');
      audioRef.current = null;
      isPlayingRef.current = false;
    };
  }, [name, loop, volume]);

  const play = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = 0;
    audio.play().catch(() => {
      // Browser may block autoplay without user gesture — silently ignore
    });
    isPlayingRef.current = true;
  }, []);

  const stop = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.pause();
    audio.currentTime = 0;
    isPlayingRef.current = false;
  }, []);

  return { play, stop, isPlaying: isPlayingRef.current };
}

/** All available sound names for enumeration (e.g. in Storybook). */
export { SOUND_NAMES };
