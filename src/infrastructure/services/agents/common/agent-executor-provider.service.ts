import type { IAgentExecutorProvider } from '../../../../application/ports/output/agents/agent-executor-provider.interface.js';
import type { IAgentExecutorFactory } from '../../../../application/ports/output/agents/agent-executor-factory.interface.js';
import type { IAgentExecutor } from '../../../../application/ports/output/agents/agent-executor.interface.js';
import { getSettings } from '../../settings.service.js';

export class AgentExecutorProvider implements IAgentExecutorProvider {
  constructor(private readonly factory: IAgentExecutorFactory) {}

  getExecutor(): IAgentExecutor {
    const settings = getSettings();
    return this.factory.createExecutor(settings.agent.type, settings.agent);
  }
}
