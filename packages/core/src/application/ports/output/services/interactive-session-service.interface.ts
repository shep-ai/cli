/**
 * Interactive Session Service Interface
 *
 * Output port for managing per-feature interactive agent sessions.
 * Handles session lifecycle (start, stop), message I/O, and real-time
 * stdout streaming to SSE consumers.
 *
 * Following Clean Architecture:
 * - Application layer depends on this interface
 * - Infrastructure layer provides the concrete implementation (singleton)
 */

import type {
  InteractiveSession,
  InteractiveMessage,
} from '../../../../domain/generated/output.js';

/**
 * A single streaming chunk forwarded from agent stdout to an SSE consumer.
 */
export interface StreamChunk {
  /** Incremental output text from the agent */
  delta: string;
  /** True when the agent has finished this response turn */
  done: boolean;
  /** Optional log entry for tool use / thinking events (shown as status indicator) */
  log?: string;
  /** Structured activity event for rich rendering in the thread */
  activity?: StreamActivity;
}

/**
 * A structured activity event emitted during agent execution.
 * Rendered as a distinct inline entry in the chat thread.
 */
export interface StreamActivity {
  kind: 'tool_use' | 'tool_result' | 'thinking' | 'system';
  /** Tool name or system event label */
  label: string;
  /** Human-readable detail (file path, command, pattern, etc.) */
  detail?: string;
}

/**
 * Function returned by subscribe() to remove the listener.
 */
export type UnsubscribeFn = () => void;

/**
 * Chat state returned by getChatState — single response for the frontend.
 */
export interface ChatState {
  /** All persisted messages for the feature, ordered by created_at ASC */
  messages: InteractiveMessage[];
  /** Status of the active session (null if no session exists) */
  sessionStatus: string | null;
  /** In-progress streaming text from the agent (null when idle) */
  streamingText: string | null;
  /** Session info for the toolbar (null if no active session) */
  sessionInfo: SessionInfo | null;
}

/** Live session metadata for the frontend toolbar. */
export interface SessionInfo {
  pid: number | null;
  sessionId: string | null;
  model: string | null;
  startedAt: string;
  idleTimeoutMinutes: number;
  lastActivityAt: string;
}

/**
 * Service interface for interactive session lifecycle management.
 *
 * Implementations are expected to be singletons: they maintain in-memory
 * state (process handles, timers, subscriber maps) across multiple HTTP
 * requests for the duration of the server process.
 *
 * **Polymorphic `featureId` scope key:** The `featureId` parameter used
 * throughout this interface is a polymorphic scope key that determines
 * message and session isolation:
 * - Feature chat: actual feature UUID (e.g. `"feat-abc123"`)
 * - Repository chat: repo identifier (e.g. `"repo-<repoId>"`)
 * - Global chat: literal string `"global"`
 *
 * All messages and sessions are scoped by this key regardless of chat type.
 *
 * @todo Consider renaming to `scopeId` with a `scopeType` discriminator
 *       for better type safety and clarity.
 */
export interface IInteractiveSessionService {
  /**
   * Start a new interactive session for the given feature.
   * Creates a DB record (status=booting), spawns the agent process with
   * the feature worktree as CWD, injects the feature context prompt, and
   * waits for the agent's first response before returning.
   *
   * @param featureId - The feature to associate the session with
   * @param worktreePath - Absolute path to the feature worktree (CWD for the agent)
   * @returns The newly created session record (status may still be 'booting')
   * @throws ConcurrentSessionLimitError when the configured cap is reached
   */
  startSession(featureId: string, worktreePath: string): Promise<InteractiveSession>;

  /**
   * Stop an active session: send SIGTERM to the process, cancel the idle
   * timer, and mark the DB record as stopped. Idempotent — calling on an
   * already-stopped session is a no-op.
   *
   * @param sessionId - The session to stop
   */
  stopSession(sessionId: string): Promise<void>;

  /**
   * Send a user message to the agent stdin and persist it to the DB.
   * Resets the idle timeout clock. Returns the persisted message record.
   *
   * @param sessionId - The target session
   * @param content - Message text (max 32 KB)
   * @returns The persisted InteractiveMessage
   * @throws Error if the session is not in 'ready' status
   */
  sendMessage(sessionId: string, content: string): Promise<InteractiveMessage>;

  /**
   * Return all messages for the feature, ordered by created_at ASC.
   * History is scoped per feature (not per session) for cross-session continuity.
   *
   * @param featureId - The feature whose message history to retrieve
   * @param limit - Max messages to return (default 200)
   */
  getMessages(featureId: string, limit?: number): Promise<InteractiveMessage[]>;

  /**
   * Return the most recent session for the given ID, or null if not found.
   *
   * @param sessionId - The session ID to look up
   */
  getSession(sessionId: string): Promise<InteractiveSession | null>;

  /**
   * Delete all messages for a feature (clear chat history).
   *
   * @param featureId - The feature whose messages to delete
   */
  clearMessages(featureId: string): Promise<void>;

  /**
   * Subscribe to real-time stdout chunks for a session.
   * The callback is invoked with each agent output chunk as it arrives and
   * once more with done=true when the turn ends.
   *
   * @param sessionId - The session to subscribe to
   * @param onChunk - Callback invoked with each chunk
   * @returns An unsubscribe function; call it to stop receiving events
   */
  subscribe(sessionId: string, onChunk: (chunk: StreamChunk) => void): UnsubscribeFn;

  // ── Feature-scoped API (frontend doesn't manage sessions) ─────────────

  /**
   * Send a user message for a feature. The service handles session lifecycle:
   * - Persists the user message to DB immediately
   * - If session is ready: sends to agent
   * - If session is booting: queues the message
   * - If no session: boots one and queues the message
   *
   * @returns The persisted user message
   */
  sendUserMessage(
    featureId: string,
    content: string,
    worktreePath: string
  ): Promise<InteractiveMessage>;

  /**
   * Get the complete chat state for a feature in a single call.
   * Merges DB messages with any in-flight streaming content.
   */
  getChatState(featureId: string): Promise<ChatState>;

  /**
   * Subscribe to real-time chunks for a feature's active session.
   * Resolves the active session internally.
   */
  subscribeByFeature(featureId: string, onChunk: (chunk: StreamChunk) => void): UnsubscribeFn;

  /**
   * Stop the active session for a feature. Kills the agent process.
   * Idempotent — no-op if no active session exists.
   */
  stopByFeature(featureId: string): Promise<void>;
}
