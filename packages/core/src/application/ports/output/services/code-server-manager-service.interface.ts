/**
 * Code Server Manager Service Interface
 *
 * Output port for managing code-server (VS Code in the browser) instance lifecycle.
 * Infrastructure layer provides the concrete implementation that handles process
 * spawning, port allocation, and SQLite state persistence.
 *
 * Each code-server instance is scoped to a single feature worktree.
 * Instances bind exclusively to 127.0.0.1 with --auth none for local-only access.
 */

import type { CodeServerInstance } from '../../../../domain/generated/output.js';

/**
 * Result returned when a code-server instance is successfully started.
 */
export interface CodeServerStartResult {
  /** Full URL to access code-server (e.g., http://127.0.0.1:13370) */
  url: string;
  /** Port code-server is bound to on localhost */
  port: number;
  /** OS process ID of the code-server process */
  pid: number;
  /** Feature ID this instance is scoped to */
  featureId: string;
}

/**
 * Port interface for code-server process lifecycle management.
 *
 * Implementations must:
 * - Allocate ports starting at 13370 to avoid collisions with daemon/dev servers
 * - Spawn code-server as a detached process bound to 127.0.0.1 only (never 0.0.0.0)
 * - Persist instance state to SQLite for reconciliation across daemon restarts
 * - Use SIGTERM with 5-second timeout + SIGKILL fallback for graceful shutdown
 * - Check PID liveness via process.kill(pid, 0) for status queries and reconciliation
 */
export interface ICodeServerManagerService {
  /**
   * Start a code-server instance for a feature worktree.
   * Idempotent — returns existing instance URL if already running (PID alive).
   *
   * @param featureId - Feature ID to scope the instance to
   * @param worktreePath - Absolute path to the feature worktree directory
   * @returns Start result with URL, port, PID, and feature ID
   * @throws Error if port allocation fails or code-server binary is not found
   */
  start(featureId: string, worktreePath: string): Promise<CodeServerStartResult>;

  /**
   * Stop a running code-server instance for a feature.
   * Sends SIGTERM, waits up to 5 seconds, then SIGKILL if still alive.
   * No-op if instance not found or already stopped.
   *
   * @param featureId - Feature ID of the instance to stop
   */
  stop(featureId: string): Promise<void>;

  /**
   * Get the current status of a code-server instance for a feature.
   * Checks PID liveness and auto-reconciles stale state (marks dead PIDs as stopped).
   *
   * @param featureId - Feature ID to check
   * @returns Instance state or null if no instance exists for this feature
   */
  getStatus(featureId: string): Promise<CodeServerInstance | null>;

  /**
   * List all instances with status "running".
   *
   * @returns Array of running code-server instances
   */
  listRunning(): Promise<CodeServerInstance[]>;

  /**
   * Stop all running code-server instances.
   * Handles partial failures — logs errors and continues stopping remaining instances.
   * Should be called during daemon shutdown.
   */
  stopAll(): Promise<void>;

  /**
   * Reconcile persisted state with actual process liveness.
   * Queries all "running" instances from SQLite, checks each PID, and marks
   * instances with dead PIDs as "stopped". Should run on service initialization.
   */
  reconcile(): Promise<void>;
}
