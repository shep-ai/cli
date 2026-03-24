/**
 * Interactive Agent Adapter Interface
 *
 * Output port for creating and resuming SDK-based interactive agent sessions.
 * Replaces the process-factory approach with a long-lived session object that
 * supports multi-turn conversations without respawning processes.
 *
 * Following Clean Architecture:
 * - Application layer depends on this interface
 * - Infrastructure layer provides the concrete implementation (ClaudeAgentSdkAdapter)
 */

import type { SDKSession } from '@anthropic-ai/claude-agent-sdk';

export type { SDKSession };

/** Options for creating or resuming an interactive agent session. */
export interface InteractiveSessionOptions {
  /** Absolute worktree path (used as CWD for the agent process). */
  cwd: string;
  /** Model override (e.g. 'claude-sonnet-4-6'). Uses adapter default if omitted. */
  model?: string;
  /** Feature context string to append to the agent's system prompt. */
  systemPrompt?: string;
}

/**
 * Adapter interface for creating SDK-based interactive agent sessions.
 * Each session object supports multiple send()/stream() turns without
 * respawning the underlying process.
 */
export interface IInteractiveAgentAdapter {
  /**
   * Create a new SDK session with the given options.
   *
   * @param options - Session configuration including CWD, model, and system prompt
   * @returns A live SDK session ready to receive messages
   */
  createSession(options: InteractiveSessionOptions): Promise<SDKSession>;

  /**
   * Resume an existing SDK session by its session ID.
   *
   * @param sessionId - The session ID returned from a prior session's first message
   * @param options - Session configuration (model override, CWD)
   * @returns A resumed SDK session ready to receive messages
   */
  resumeSession(sessionId: string, options: InteractiveSessionOptions): Promise<SDKSession>;
}
