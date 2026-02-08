/**
 * Agent Runner Service
 *
 * Infrastructure implementation of the IAgentRunner port.
 * Orchestrates agent execution by resolving definitions from the registry,
 * creating executors, compiling LangGraph workflows, and tracking runs
 * in the repository.
 */

import * as crypto from 'node:crypto';
import type { BaseCheckpointSaver } from '@langchain/langgraph';
import type {
  IAgentRunner,
  AgentRunOptions,
} from '@/application/ports/output/agent-runner.interface.js';
import type { IAgentRegistry } from '@/application/ports/output/agent-registry.interface.js';
import type { IAgentExecutorFactory } from '@/application/ports/output/agent-executor-factory.interface.js';
import type { IAgentRunRepository } from '@/application/ports/output/agent-run-repository.interface.js';
import type { AgentRun } from '@/domain/generated/output.js';
import { AgentRunStatus } from '@/domain/generated/output.js';
import { getSettings } from '@/infrastructure/services/settings.service.js';

export class AgentRunnerService implements IAgentRunner {
  constructor(
    private readonly registry: IAgentRegistry,
    private readonly executorFactory: IAgentExecutorFactory,
    private readonly checkpointer: BaseCheckpointSaver,
    private readonly runRepository: IAgentRunRepository
  ) {}

  async runAgent(agentName: string, prompt: string, options?: AgentRunOptions): Promise<AgentRun> {
    // 1. Get agent definition
    const definition = this.registry.get(agentName);
    if (!definition) {
      throw new Error(
        `Agent '${agentName}' not found. Available: ${this.registry
          .list()
          .map((a) => a.name)
          .join(', ')}`
      );
    }

    // 2. Get settings for executor config
    const settings = getSettings();
    const agentType = settings.agent.type;
    const authConfig = settings.agent;

    // 3. Create executor
    const executor = this.executorFactory.createExecutor(agentType, authConfig);

    // 4. Generate IDs
    const runId = crypto.randomUUID();
    const threadId = crypto.randomUUID();
    const now = new Date().toISOString();

    // 5. Create run record with pending status
    const agentRun: AgentRun = {
      id: runId,
      agentType,
      agentName,
      status: AgentRunStatus.pending,
      prompt,
      threadId,
      createdAt: now,
      updatedAt: now,
    };
    await this.runRepository.create(agentRun);

    // 6. Update to running
    await this.runRepository.updateStatus(runId, AgentRunStatus.running, {
      pid: process.pid,
      startedAt: now,
      updatedAt: now,
    });

    try {
      // 7. Compile and invoke graph
      const compiledGraph = definition.graphFactory(executor, this.checkpointer);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await (compiledGraph as any).invoke(
        { repositoryPath: options?.repositoryPath ?? process.cwd() },
        { configurable: { thread_id: threadId } }
      );

      // 8. Update to completed
      const completedAt = new Date().toISOString();
      await this.runRepository.updateStatus(runId, AgentRunStatus.completed, {
        result: result.analysisMarkdown ?? result.result ?? JSON.stringify(result),
        completedAt,
        updatedAt: completedAt,
      });

      const completedRun = await this.runRepository.findById(runId);
      return completedRun!;
    } catch (error) {
      // 9. Update to failed
      const failedAt = new Date().toISOString();
      await this.runRepository.updateStatus(runId, AgentRunStatus.failed, {
        error: error instanceof Error ? error.message : String(error),
        completedAt: failedAt,
        updatedAt: failedAt,
      });

      const failedRun = await this.runRepository.findById(runId);
      return failedRun!;
    }
  }
}
