/**
 * Run Agent Use Case
 *
 * Executes a named agent workflow by resolving it from the registry
 * and delegating to the agent runner.
 *
 * Business Rules:
 * - Agent must be registered in the registry before running
 * - Error messages include available agent names for discoverability
 * - Options are passed through to the runner as-is
 */

import { injectable, inject } from 'tsyringe';
import type { AgentRun, AgentRunEvent } from '../../../domain/generated/output.js';
import type {
  IAgentRunner,
  AgentRunOptions,
} from '../../ports/output/agents/agent-runner.interface.js';
import type { IAgentRegistry } from '../../ports/output/agents/agent-registry.interface.js';

/**
 * Input for running an agent workflow.
 */
export interface RunAgentInput {
  agentName: string;
  prompt: string;
  options?: AgentRunOptions;
}

/**
 * Use case for running a named agent workflow.
 *
 * Algorithm:
 * 1. Validate agent exists in the registry
 * 2. Delegate to agent runner with name, prompt, and options
 * 3. Return the resulting AgentRun record
 */
@injectable()
export class RunAgentUseCase {
  constructor(
    @inject('IAgentRunner')
    private readonly agentRunner: IAgentRunner,
    @inject('IAgentRegistry')
    private readonly agentRegistry: IAgentRegistry
  ) {}

  /**
   * Execute the run agent use case.
   *
   * @param input - Agent run input including name, prompt, and options
   * @returns AgentRun record tracking the execution
   * @throws Error if the agent name is not registered
   */
  async execute(input: RunAgentInput): Promise<AgentRun> {
    const definition = this.agentRegistry.get(input.agentName);
    if (!definition) {
      const available = this.agentRegistry.list().map((a) => a.name);
      throw new Error(
        `Unknown agent: "${input.agentName}". Available agents: ${available.join(', ') || 'none'}`
      );
    }

    return this.agentRunner.runAgent(input.agentName, input.prompt, input.options);
  }

  /**
   * Execute the run agent use case with streaming events.
   *
   * @param input - Agent run input including name, prompt, and options
   * @returns An async iterable of agent run events
   * @throws Error if the agent name is not registered
   */
  async *executeStream(input: RunAgentInput): AsyncIterable<AgentRunEvent> {
    const definition = this.agentRegistry.get(input.agentName);
    if (!definition) {
      const available = this.agentRegistry.list().map((a) => a.name);
      throw new Error(
        `Unknown agent: "${input.agentName}". Available agents: ${available.join(', ') || 'none'}`
      );
    }

    yield* this.agentRunner.runAgentStream(input.agentName, input.prompt, input.options);
  }
}
