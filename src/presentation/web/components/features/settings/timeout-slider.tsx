'use client';

import { useState, useCallback } from 'react';
import { Slider } from '@/components/ui/slider';

/** Fixed duration presets in seconds — slider snaps to these values */
const PRESETS = [
  60, // 1m
  120, // 2m
  300, // 5m
  600, // 10m
  900, // 15m
  1800, // 30m
  2700, // 45m
  3600, // 1h
  7200, // 2h
  10800, // 3h
  14400, // 4h
  21600, // 6h
  28800, // 8h
  43200, // 12h
  86400, // 24h
];

const SLIDER_MAX = PRESETS.length - 1;

/** Find the closest preset index for a given seconds value */
function secondsToIndex(seconds: number): number {
  let closest = 0;
  let minDiff = Math.abs(seconds - PRESETS[0]);
  for (let i = 1; i < PRESETS.length; i++) {
    const diff = Math.abs(seconds - PRESETS[i]);
    if (diff < minDiff) {
      minDiff = diff;
      closest = i;
    }
  }
  return closest;
}

export interface TimeoutSliderProps {
  id: string;
  testId: string;
  /** Current value in seconds (as a string for form compatibility) */
  value: string;
  onChange: (value: string) => void;
  onBlur: () => void;
  defaultSeconds?: number;
}

function formatDuration(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.round((totalSeconds % 3600) / 60);

  if (hours === 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
}

export function TimeoutSlider({
  id,
  testId,
  value,
  onChange,
  onBlur,
  defaultSeconds = 1800,
}: TimeoutSliderProps) {
  const numValue = value === '' ? defaultSeconds : parseInt(value, 10);
  const seconds = numValue || defaultSeconds;

  // Local index state prevents snap-back during drag — updates immediately
  // without waiting for the parent to re-render with the new value.
  const [localIndex, setLocalIndex] = useState(() => secondsToIndex(seconds));

  // Sync from props only when the resolved index actually differs
  // (e.g. external reset or server push). Avoids overwriting during drag.
  const propsIndex = secondsToIndex(seconds);
  if (propsIndex !== localIndex && PRESETS[localIndex] !== seconds) {
    setLocalIndex(propsIndex);
  }

  const handleChange = useCallback(
    ([i]: number[]) => {
      setLocalIndex(i);
      onChange(String(PRESETS[i]));
    },
    [onChange]
  );

  return (
    <div className="flex w-55 items-center gap-2">
      <Slider
        id={id}
        data-testid={testId}
        min={0}
        max={SLIDER_MAX}
        step={1}
        value={[localIndex]}
        onValueChange={handleChange}
        onValueCommit={() => onBlur()}
        className="min-w-0 flex-1"
      />
      <span className="text-muted-foreground shrink-0 text-right text-xs tabular-nums">
        {formatDuration(PRESETS[localIndex])}
      </span>
    </div>
  );
}
