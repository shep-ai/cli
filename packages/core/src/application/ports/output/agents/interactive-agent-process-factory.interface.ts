/**
 * Interactive Agent Process Factory Interface
 *
 * Output port for spawning per-turn interactive agent subprocesses.
 * Each conversation turn spawns a fresh process in print mode (-p).
 * Multi-turn context is maintained via the agent CLI's --resume flag.
 *
 * Following Clean Architecture:
 * - Application layer depends on this interface
 * - Infrastructure layer provides the concrete implementation
 */

import type { ChildProcessWithoutNullStreams } from 'node:child_process';

/** Options for spawning an interactive agent process. */
export interface InteractiveSpawnOptions {
  /** Agent CLI session ID to resume a prior conversation turn. */
  resumeSessionId?: string;
  /** Model override (e.g. 'sonnet', 'opus', 'haiku'). Uses agent default if omitted. */
  model?: string;
}

/**
 * Factory interface for creating interactive agent subprocesses.
 * Each call produces a fresh process with piped stdio and the given CWD.
 * The caller writes the prompt to stdin and calls stdin.end() to trigger execution.
 */
export interface IInteractiveAgentProcessFactory {
  /**
   * Spawn an interactive agent process in print mode with stdio piped.
   *
   * @param worktreePath - Absolute path to the feature worktree (used as CWD)
   * @param options - Optional spawn options (e.g. resume session ID)
   * @returns A spawned child process with guaranteed non-null stdin/stdout/stderr
   * @throws Error if the configured agent type does not support interactive mode
   */
  spawn(
    worktreePath: string,
    options?: InteractiveSpawnOptions
  ): Promise<ChildProcessWithoutNullStreams>;
}
