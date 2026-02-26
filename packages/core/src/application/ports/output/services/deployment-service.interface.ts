/**
 * Deployment Service Interface
 *
 * Output port for managing local dev server deployments.
 * Infrastructure layer provides the concrete DeploymentService implementation
 * backed by an in-memory process registry.
 *
 * Following Clean Architecture:
 * - Application layer depends on this interface
 * - Infrastructure layer provides concrete implementations
 */

import type { DeploymentState } from '@/domain/generated/output.js';

/** Status snapshot returned by getStatus(). */
export interface DeploymentStatus {
  /** Current lifecycle state of the deployment. */
  state: DeploymentState;
  /** Detected URL when the dev server is Ready, null while Booting. */
  url: string | null;
}

/**
 * Port interface for managing local dev server deployments.
 *
 * Implementations must:
 * - Maintain an in-memory registry of active deployments keyed by targetId
 * - Enforce one deployment per target (stop existing before starting new)
 * - Detect the dev script from package.json and spawn via the correct package manager
 * - Parse stdout/stderr for port/URL detection
 * - Support graceful shutdown (SIGTERM → SIGKILL) for individual and bulk stops
 */
export interface IDeploymentService {
  /**
   * Start a dev server deployment for the given target.
   * If a deployment already exists for this targetId, it is stopped first.
   *
   * @param targetId - Unique identifier for the deployment target (featureId or repositoryId)
   * @param targetPath - Absolute filesystem path to the directory to run the dev server in
   * @returns The initial deployment state (always Booting on success)
   * @throws Error if no dev script is found in package.json or the process fails to spawn
   */
  start(targetId: string, targetPath: string): void;

  /**
   * Stop a running deployment gracefully.
   * Sends SIGTERM to the process group, then SIGKILL after a timeout.
   * No-op if no deployment exists for this targetId.
   *
   * @param targetId - Unique identifier for the deployment target
   */
  stop(targetId: string): Promise<void>;

  /**
   * Get the current deployment status for a target.
   *
   * @param targetId - Unique identifier for the deployment target
   * @returns Status snapshot with state and url, or null if no deployment exists
   */
  getStatus(targetId: string): DeploymentStatus | null;

  /**
   * Force-stop all tracked deployments immediately.
   * Called during daemon shutdown to prevent orphaned dev server processes.
   */
  stopAll(): void;
}
