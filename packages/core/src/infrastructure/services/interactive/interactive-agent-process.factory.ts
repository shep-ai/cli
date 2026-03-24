/**
 * Interactive Agent Process Factory
 *
 * Infrastructure implementation of IInteractiveAgentProcessFactory.
 * Resolves the configured agent type via IAgentExecutorProvider, then
 * spawns the CLI binary in conversation mode with stream-json I/O.
 *
 * The process is long-lived — it stays alive between turns. Messages are
 * sent via stdin as JSON lines (`--input-format stream-json`) and responses
 * stream back via stdout (`--output-format stream-json`).
 *
 * The first call spawns the process; subsequent turns reuse the same PID.
 * The --resume flag is used on the FIRST spawn to restore a prior session.
 *
 * Currently supports ClaudeCode. Additional agent types can be added
 * by extending the AGENT_FLAGS lookup table.
 */

import type { ChildProcessWithoutNullStreams } from 'node:child_process';
import type {
  IInteractiveAgentProcessFactory,
  InteractiveSpawnOptions,
} from '../../../application/ports/output/agents/interactive-agent-process-factory.interface.js';
import type { IAgentExecutorProvider } from '../../../application/ports/output/agents/agent-executor-provider.interface.js';
import { AgentType } from '../../../domain/generated/output.js';
import { IS_WINDOWS } from '../../platform.js';
import type { SpawnFunction } from '../agents/common/types.js';

/**
 * CLI flags for conversation mode (persistent process).
 * --input-format stream-json: accept JSON messages on stdin
 * --output-format stream-json: emit structured JSON events on stdout
 * --verbose + --include-partial-messages: rich streaming events
 */
const AGENT_CONVERSATION_FLAGS: Partial<Record<AgentType, string[]>> = {
  [AgentType.ClaudeCode]: [
    '--output-format',
    'stream-json',
    '--input-format',
    'stream-json',
    '--dangerously-skip-permissions',
    '--verbose',
    '--include-partial-messages',
    '--no-chrome',
  ],
};

/**
 * The CLI binary name for each supported agent type.
 */
const AGENT_BINARY: Partial<Record<AgentType, string>> = {
  [AgentType.ClaudeCode]: 'claude',
};

/**
 * Factory for spawning interactive agent subprocesses.
 * Uses dependency-injected spawn function for testability.
 */
export class InteractiveAgentProcessFactory implements IInteractiveAgentProcessFactory {
  constructor(
    private readonly executorProvider: IAgentExecutorProvider,
    private readonly spawnFn: SpawnFunction
  ) {}

  async spawn(
    worktreePath: string,
    options?: InteractiveSpawnOptions
  ): Promise<ChildProcessWithoutNullStreams> {
    const executor = await this.executorProvider.getExecutor();
    const agentType = executor.agentType as AgentType;

    const binary = AGENT_BINARY[agentType];
    const baseFlags = AGENT_CONVERSATION_FLAGS[agentType];

    if (!binary || !baseFlags) {
      throw new Error(
        `Agent type '${agentType}' does not support interactive mode. ` +
          `Supported types: ${Object.keys(AGENT_BINARY).join(', ')}`
      );
    }

    const args = [...baseFlags];

    // Resume a prior conversation if a session ID is provided
    if (options?.resumeSessionId) {
      args.push('--resume', options.resumeSessionId);
    }

    // Model override
    if (options?.model) {
      args.push('--model', options.model);
    }

    // Strip CLAUDECODE to prevent nested session error when shep is running
    // inside an existing Claude Code session.
    const { CLAUDECODE: _, ...cleanEnv } = process.env;

    const spawnOptions: Record<string, unknown> = {
      cwd: worktreePath,
      stdio: ['pipe', 'pipe', 'pipe'],
      env: cleanEnv,
    };

    if (IS_WINDOWS) {
      spawnOptions.windowsHide = true;
    }

    return this.spawnFn(binary, args, spawnOptions) as ChildProcessWithoutNullStreams;
  }
}
