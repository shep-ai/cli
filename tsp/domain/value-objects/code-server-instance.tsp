/**
 * @module Shep.Domain.ValueObjects.CodeServerInstance
 *
 * Defines the CodeServerInstance value object and CodeServerInstanceStatus enum
 * for tracking managed code-server (VS Code in the browser) process state.
 *
 * This is a value object (not an entity) - it does NOT extend BaseEntity.
 * It is managed entirely by the CodeServerManagerService and has no
 * independent business logic or domain events. Identity comes from the
 * featureId it is associated with.
 *
 * ## Usage
 *
 * Import this module to access code-server instance state:
 *
 * ```typespec
 * import "./code-server-instance.tsp";
 *
 * model CodeServerManagerState {
 *   instances: CodeServerInstance[];
 * }
 * ```
 */
/**
 * Status of a managed code-server instance.
 *
 * Represents the lifecycle state of a code-server process:
 * - running: Process is alive and serving on its allocated port
 * - stopped: Process has been terminated (gracefully or via idle timeout)
 */
@doc("Status of a code-server instance")
enum CodeServerInstanceStatus {
  @doc("Process is alive and serving")
  Running: "running",

  @doc("Process has been terminated")
  Stopped: "stopped",
}

/**
 * Represents the state of a managed code-server instance.
 *
 * CodeServerInstance is a value object that captures the process state of a
 * code-server instance bound to a specific feature worktree. It tracks the
 * PID, port, worktree path, and lifecycle timestamps needed for process
 * management, reconciliation, and UI status display.
 *
 * Note: This is a value object, NOT an entity. It does not extend
 * BaseEntity and has no independent lifecycle outside the
 * CodeServerManagerService.
 *
 * ## Properties
 *
 * | Property     | Type                       | Required | Description                                |
 * |--------------|----------------------------|----------|--------------------------------------------|
 * | id           | string                     | Yes      | Unique identifier for this instance record |
 * | featureId    | string                     | Yes      | Feature ID this instance is scoped to      |
 * | pid          | int32                      | Yes      | OS process ID of the code-server process   |
 * | port         | int32                      | Yes      | Port code-server is bound to on localhost  |
 * | worktreePath | string                     | Yes      | Absolute path to the feature worktree      |
 * | status       | CodeServerInstanceStatus   | Yes      | Current lifecycle status                   |
 * | startedAt    | utcDateTime                | Yes      | When the instance was started              |
 * | stoppedAt    | utcDateTime                | No       | When the instance was stopped (if stopped) |
 *
 * @example
 * ```json
 * {
 *   "id": "550e8400-e29b-41d4-a716-446655440000",
 *   "featureId": "feat-123",
 *   "pid": 12345,
 *   "port": 13370,
 *   "worktreePath": "/home/user/.shep/repos/abc123/wt/my-feature",
 *   "status": "running",
 *   "startedAt": "2026-02-25T10:00:00Z"
 * }
 * ```
 */
@doc("State of a managed code-server instance")
model CodeServerInstance {
  /**
   * Unique identifier for this instance record
   * @example "550e8400-e29b-41d4-a716-446655440000"
   */
  @doc("Unique identifier for this instance record")
  id: string;

  /**
   * Feature ID this code-server instance is scoped to.
   * One instance per feature (enforced by UNIQUE constraint).
   * @example "feat-123"
   */
  @doc("Feature ID this instance is scoped to")
  featureId: string;

  /**
   * OS process ID of the running code-server process
   * @example 12345
   */
  @doc("OS process ID of the code-server process")
  pid: int32;

  /**
   * Port number code-server is bound to on 127.0.0.1
   * @example 13370
   */
  @doc("Port code-server is bound to on localhost")
  port: int32;

  /**
   * Absolute path to the feature worktree directory
   * @example "/home/user/.shep/repos/abc123/wt/my-feature"
   */
  @doc("Absolute path to the feature worktree")
  worktreePath: string;

  /**
   * Current lifecycle status of the code-server instance
   * @example "running"
   */
  @doc("Current lifecycle status")
  status: CodeServerInstanceStatus;

  /**
   * Timestamp when the instance was started
   * @example "2026-02-25T10:00:00Z"
   */
  @doc("When the instance was started")
  startedAt: utcDateTime;

  /**
   * Timestamp when the instance was stopped (null if still running)
   * @example "2026-02-25T10:30:00Z"
   */
  @doc("When the instance was stopped (if stopped)")
  stoppedAt?: utcDateTime;
}
