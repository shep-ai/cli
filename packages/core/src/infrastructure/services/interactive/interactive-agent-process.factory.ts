/**
 * Interactive Agent Process Factory
 *
 * Infrastructure implementation of IInteractiveAgentProcessFactory.
 * Resolves the configured agent type via IAgentExecutorProvider, then
 * spawns the CLI binary in print mode (-p) with stream-json output.
 *
 * Each call creates a single-turn process. Multi-turn conversations
 * are maintained via the --resume flag with the agent's session ID.
 * The caller writes the prompt to stdin and calls stdin.end().
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
 * Base CLI flags for each supported agent type in print mode.
 * -p enables print (non-interactive) mode, reading prompt from stdin.
 * stream-json + --verbose + --include-partial-messages give us structured
 * JSON events including text deltas and a final result with session_id.
 */
const AGENT_PRINT_FLAGS: Partial<Record<AgentType, string[]>> = {
  [AgentType.ClaudeCode]: [
    '-p',
    '--output-format',
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
    const baseFlags = AGENT_PRINT_FLAGS[agentType];

    if (!binary || !baseFlags) {
      throw new Error(
        `Agent type '${agentType}' does not support interactive mode. ` +
          `Supported types: ${Object.keys(AGENT_BINARY).join(', ')}`
      );
    }

    const args = [...baseFlags];

    // Resume a prior conversation turn if a session ID is provided
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
