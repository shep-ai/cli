/**
 * stopDaemon() — Shared daemon-stop helper
 *
 * Contains the stop logic for gracefully terminating a running Shep daemon.
 * Used by:
 *   - stop.command.ts (shep stop)
 *   - restart.command.ts (shep restart)
 *   - upgrade.command.ts (shep upgrade — stops before install)
 *
 * Stop sequence:
 *   1. Read daemon.json via IDaemonService
 *   2. If no daemon / PID not alive: silently clean up daemon.json and return
 *   3. Validate PID is a positive finite integer
 *   4. Send SIGTERM
 *   5. Poll process liveness every 200ms for up to 5000ms
 *   6. If still alive after 5s, send SIGKILL (errors suppressed — process may have exited)
 *   7. Always delete daemon.json (in finally block)
 *
 * @param daemonService - IDaemonService instance (injected by caller for testability, NFR-4)
 */

import type { IDaemonService } from '@/application/ports/output/services/daemon-service.interface.js';
import { messages } from '../../ui/index.js';

const POLL_INTERVAL_MS = 200;
const MAX_WAIT_MS = 5000;

/**
 * Poll until the given PID is dead or the timeout expires.
 * Returns true if the process is dead, false if it survived the timeout.
 */
async function pollUntilDead(
  daemonService: IDaemonService,
  pid: number,
  maxMs: number,
  intervalMs: number
): Promise<boolean> {
  const deadline = Date.now() + maxMs;
  while (Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
    if (!daemonService.isAlive(pid)) {
      return true;
    }
  }
  return false;
}

/**
 * Stop the Shep daemon gracefully.
 * Safe to call when no daemon is running — silently cleans up stale daemon.json (NFR-2).
 */
export async function stopDaemon(daemonService: IDaemonService): Promise<void> {
  const state = await daemonService.read();

  // No daemon running or PID not alive — silently clean up and return
  if (!state || !daemonService.isAlive(state.pid)) {
    await daemonService.delete();
    return;
  }

  const { pid } = state;

  // Validate PID is a positive finite integer before kill
  if (!Number.isFinite(pid) || !Number.isInteger(pid) || pid <= 0) {
    await daemonService.delete();
    return;
  }

  try {
    messages.info(`Stopping Shep daemon (PID ${pid})...`);

    // Send SIGTERM — request graceful shutdown
    process.kill(pid, 'SIGTERM');

    // Poll for up to 5s waiting for the process to exit
    const died = await pollUntilDead(daemonService, pid, MAX_WAIT_MS, POLL_INTERVAL_MS);

    if (!died) {
      // Graceful shutdown timed out — force kill
      messages.info('Daemon did not stop gracefully, sending SIGKILL...');
      try {
        process.kill(pid, 'SIGKILL');
      } catch {
        // Process may have exited between the check and the kill — ignore
      }
    }

    messages.success('Shep daemon stopped.');
  } finally {
    // Always clean up daemon.json regardless of termination path
    await daemonService.delete();
  }
}
