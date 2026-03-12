/**
 * Check whether a process with the given PID is still running.
 *
 * Uses `process.kill(pid, 0)` which sends signal 0 (no-op) to test existence.
 * Returns false when the PID does not exist or belongs to a zombie.
 */
export function isProcessAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}
