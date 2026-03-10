/**
 * Formats a duration in milliseconds to a human-friendly string.
 *
 * - 0ms        → "0s"
 * - <1s        → "<1s"
 * - <60s       → "Xs"
 * - <1h        → "Xm Ys"
 * - ≥1h        → "Xh Ym" (seconds omitted)
 */
export function formatDuration(ms: number): string {
  if (ms === 0) return '0s';

  const totalSeconds = Math.floor(ms / 1000);
  if (totalSeconds === 0) return '<1s';

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }

  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }

  return `${seconds}s`;
}
