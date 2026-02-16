/**
 * Agent Runner Interface
 *
 * Output port for running named agent workflows (e.g., analyze-repository,
 * gather-requirements). The runner resolves the agent from the registry
 * and orchestrates execution, producing an AgentRun record.
 *
 * Following Clean Architecture:
 * - Domain and Application layers depend on this interface
 * - Infrastructure layer provides concrete implementations
 *
 * @example
 * ```typescript
 * const runner: IAgentRunner = container.resolve('IAgentRunner');
 * const run = await runner.runAgent('analyze-repository', 'Analyze the codebase', {
 *   repositoryPath: '/path/to/repo',
 *   model: 'claude-sonnet-4-5-20250929',
 *   timeout: 60000,
 * });
 * console.log(run.status); // 'running' | 'completed' | 'failed'
 * ```
 */

import type { AgentRun, AgentRunEvent } from '../../../../domain/generated/output.js';

/**
 * Options for controlling agent run behavior.
 */
export interface AgentRunOptions {
  /** Working directory / repository path for the agent */
  repositoryPath?: string;
  /** Model to use for this run */
  model?: string;
  /** Session ID to resume a previous agent session */
  resumeSession?: string;
  /** Whether to run the agent in the background */
  background?: boolean;
  /** Execution timeout in milliseconds */
  timeout?: number;
}

/**
 * Port interface for running named agent workflows.
 *
 * Implementations must:
 * - Resolve the agent by name from the registry
 * - Execute the agent graph with the provided prompt and options
 * - Return a fully-populated AgentRun record
 *
 * @example
 * ```typescript
 * const runner: IAgentRunner = container.resolve('IAgentRunner');
 *
 * // Run an agent with default options
 * const run = await runner.runAgent('gather-requirements', 'What are the user needs?');
 *
 * // Run with specific options
 * const run = await runner.runAgent('implement-feature', 'Build the login form', {
 *   repositoryPath: '/workspace/my-app',
 *   background: true,
 *   timeout: 120000,
 * });
 * ```
 */
export interface IAgentRunner {
  /**
   * Run a named agent workflow with the given prompt.
   *
   * @param agentName - The registered agent name (e.g., 'analyze-repository')
   * @param prompt - The prompt to send to the agent
   * @param options - Optional run configuration
   * @returns The agent run record tracking execution
   */
  runAgent(agentName: string, prompt: string, options?: AgentRunOptions): Promise<AgentRun>;

  /**
   * Run a named agent workflow and stream events as they arrive.
   *
   * @param agentName - The registered agent name (e.g., 'analyze-repository')
   * @param prompt - The prompt to send to the agent
   * @param options - Optional run configuration
   * @returns An async iterable of agent run events
   */
  runAgentStream(
    agentName: string,
    prompt: string,
    options?: AgentRunOptions
  ): AsyncIterable<AgentRunEvent>;
}
