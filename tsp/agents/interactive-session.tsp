/**
 * @module Shep.Agents.InteractiveSession
 *
 * Persistent record of a per-feature interactive agent session.
 * Each session corresponds to a single long-lived OS process spawned
 * on demand when the user opens the Chat tab for a feature.
 *
 * ## Session Lifecycle
 *
 * ```
 * booting --> ready --> stopped
 *    |                     ^
 *    +------> error -------+
 * ```
 *
 * Sessions are 1-to-1 with a feature: only one session can be in
 * 'booting' or 'ready' state per feature at any time.
 *
 * @see tsp/agents/interactive-message.tsp
 * @see docs/architecture/agent-system.md
 */
import "../common/base.tsp";
import "../common/scalars.tsp";

/**
 * Interactive Session Status
 *
 * Lifecycle states for a per-feature interactive agent session.
 *
 * | Value   | Description                                         |
 * |---------|-----------------------------------------------------|
 * | booting | Process spawned; waiting for agent to signal ready  |
 * | ready   | Agent ready; accepting user messages                |
 * | stopped | Session stopped manually, via timeout, or on error  |
 * | error   | Process crashed or failed to boot                  |
 */
@doc("Lifecycle status of an interactive agent session")
enum InteractiveSessionStatus {
  @doc("Process spawned, waiting for agent to signal ready")
  booting: "booting",

  @doc("Agent ready and accepting user messages")
  ready: "ready",

  @doc("Session stopped manually or via idle timeout")
  stopped: "stopped",

  @doc("Process crashed or failed to start")
  error: "error",
}

/**
 * Interactive Session
 *
 * Tracks a single long-lived agent process spawned for a feature's Chat tab.
 * The process CWD is set to the feature worktree. Each feature may have at
 * most one active (booting or ready) session at any time.
 *
 * ## Properties
 *
 * | Property       | Type                     | Required | Description                                   |
 * |----------------|--------------------------|----------|-----------------------------------------------|
 * | id             | UUID                     | Yes      | Unique identifier (from BaseEntity)           |
 * | featureId      | UUID                     | Yes      | Polymorphic scope key (feature/repo/global)   |
 * | status         | InteractiveSessionStatus | Yes      | Current lifecycle status                      |
 * | startedAt      | utcDateTime              | Yes      | When the process was spawned                  |
 * | stoppedAt      | utcDateTime              | No       | When the session ended (null if still active) |
 * | lastActivityAt | utcDateTime              | Yes      | Last user message or stdout chunk timestamp   |
 * | createdAt      | utcDateTime              | Yes      | When created (from BaseEntity)                |
 * | updatedAt      | utcDateTime              | Yes      | When last updated (from BaseEntity)           |
 *
 * @example
 * ```json
 * {
 *   "id": "550e8400-e29b-41d4-a716-446655440000",
 *   "featureId": "f3e2d1c0-b9a8-47f6-e5d4-c3b2a1908070",
 *   "status": "ready",
 *   "startedAt": "2026-03-22T10:00:00Z",
 *   "stoppedAt": null,
 *   "lastActivityAt": "2026-03-22T10:05:00Z",
 *   "createdAt": "2026-03-22T10:00:00Z",
 *   "updatedAt": "2026-03-22T10:05:00Z"
 * }
 * ```
 */
@doc("Per-feature interactive agent session record")
model InteractiveSession extends BaseEntity {
  /**
   * Polymorphic scope key — not always an actual feature ID.
   * - Feature chat: actual feature UUID (e.g. "f3e2d1c0-...")
   * - Repository chat: repo identifier (e.g. "repo-<id>")
   * - Global chat: literal string "global"
   *
   * Each scope can have at most one active session at a time.
   * Future: consider renaming to `scopeId` + adding `scopeType` discriminator.
   * @example "f3e2d1c0-b9a8-47f6-e5d4-c3b2a1908070"
   */
  @doc("Polymorphic scope key: feature UUID, 'repo-<id>', or 'global'. Future: rename to scopeId + scopeType.")
  featureId: UUID;

  /**
   * Current lifecycle status of the session.
   * @example "ready"
   */
  @doc("Current lifecycle status of the interactive session")
  status: InteractiveSessionStatus;

  /**
   * Timestamp when the agent process was spawned.
   * @example "2026-03-22T10:00:00Z"
   */
  @doc("Timestamp when the agent process was spawned")
  startedAt: utcDateTime;

  /**
   * Timestamp when the session ended.
   * Null while the session is still active (booting or ready).
   * @example "2026-03-22T10:15:00Z"
   */
  @doc("Timestamp when the session ended (null if still active)")
  stoppedAt?: utcDateTime;

  /**
   * Timestamp of last activity (user message sent or stdout chunk received).
   * Used by the idle-timeout mechanism to determine when to stop the session.
   * @example "2026-03-22T10:05:00Z"
   */
  @doc("Timestamp of last user message or agent stdout activity")
  lastActivityAt: utcDateTime;
}
