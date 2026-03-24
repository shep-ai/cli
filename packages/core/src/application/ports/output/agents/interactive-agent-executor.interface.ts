/**
 * Interactive Agent Executor Interface
 *
 * Output port for creating and managing interactive agent sessions with
 * our own abstraction layer over the raw SDK types. Unlike IInteractiveAgentAdapter
 * which re-exports SDKSession directly, this interface provides clean domain types
 * (InteractiveAgentEvent, InteractiveAgentSessionHandle) that decouple the
 * application layer from any SDK specifics.
 *
 * Following Clean Architecture:
 * - Application layer depends on this interface and its domain types
 * - Infrastructure layer provides concrete implementations
 * - No SDK types leak through this boundary
 */

/** Options for creating/resuming an interactive agent session. */
export interface InteractiveAgentOptions {
  /** Absolute worktree path (CWD for agent) */
  cwd: string;
  /** Model override (e.g. 'claude-sonnet-4-6') */
  model?: string;
  /** Feature context string to append to system prompt */
  systemPrompt?: string;
}

/** Event emitted by an interactive agent session stream. */
export interface InteractiveAgentEvent {
  type: 'delta' | 'tool_use' | 'tool_result' | 'status' | 'done' | 'error';
  content?: string;
  label?: string;
  detail?: string;
}

/** Handle to a live interactive agent session. */
export interface InteractiveAgentSessionHandle {
  /** The agent's session ID (used for resumption) */
  readonly sessionId: string;
  /** Send a user message to the agent */
  send(message: string): Promise<void>;
  /** Iterate response events from the agent */
  stream(): AsyncIterable<InteractiveAgentEvent>;
  /** Terminate the session */
  close(): Promise<void>;
}

/** Executor interface for interactive agent sessions. */
export interface IInteractiveAgentExecutor {
  createSession(options: InteractiveAgentOptions): Promise<InteractiveAgentSessionHandle>;
  resumeSession(
    sessionId: string,
    options: InteractiveAgentOptions
  ): Promise<InteractiveAgentSessionHandle>;
}
