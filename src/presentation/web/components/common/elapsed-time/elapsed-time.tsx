'use client';

import { useState, useEffect } from 'react';

interface ElapsedTimeProps {
  startedAt: number;
}

export function formatElapsed(elapsedMs: number): string {
  const totalSeconds = Math.floor(elapsedMs / 1000);

  if (totalSeconds >= 3600) {
    const hours = Math.floor(totalSeconds / 3600);
    return `${hours}h`;
  }

  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export function ElapsedTime({ startedAt }: ElapsedTimeProps) {
  const [elapsed, setElapsed] = useState(() => Date.now() - startedAt);

  useEffect(() => {
    const id = setInterval(() => {
      setElapsed(Date.now() - startedAt);
    }, 1000);

    return () => clearInterval(id);
  }, [startedAt]);

  return (
    <span data-testid="elapsed-time" className="tabular-nums">
      {formatElapsed(elapsed)}
    </span>
  );
}
