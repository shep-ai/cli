/**
 * Daemon Service Interface
 *
 * Output port for managing the daemon state file (~/.shep/daemon.json).
 * Infrastructure layer provides the concrete DaemonPidService implementation.
 */

/**
 * Shape of the daemon state persisted to ~/.shep/daemon.json.
 */
export interface DaemonState {
  /** PID of the running daemon process */
  pid: number;
  /** Port the daemon web server is listening on */
  port: number;
  /** ISO 8601 timestamp of when the daemon was started */
  startedAt: string;
}

/**
 * Port interface for reading and writing daemon lifecycle state.
 *
 * Implementations must:
 * - Write atomically (write-to-temp + rename) to prevent corruption
 * - Return null from read() when no daemon.json exists (ENOENT)
 * - Swallow ENOENT in delete() — safe to call when file is absent
 * - Validate pid before any process.kill() call
 */
export interface IDaemonService {
  /**
   * Read the daemon state from daemon.json.
   * Returns null if the file does not exist.
   */
  read(): Promise<DaemonState | null>;

  /**
   * Atomically write daemon state to daemon.json.
   * Uses write-to-temp + fs.rename to prevent partial writes.
   */
  write(data: DaemonState): Promise<void>;

  /**
   * Delete daemon.json. Safe to call when file is absent (ENOENT swallowed).
   */
  delete(): Promise<void>;

  /**
   * Check whether a process with the given PID is alive.
   * Uses process.kill(pid, 0) — returns true if alive, false on ESRCH.
   * Validates that pid is a positive finite integer before checking.
   */
  isAlive(pid: number): boolean;
}
