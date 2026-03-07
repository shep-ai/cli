import type { IAgentExecutorProvider } from '../../../../application/ports/output/agents/agent-executor-provider.interface.js';
import type { IAgentExecutorFactory } from '../../../../application/ports/output/agents/agent-executor-factory.interface.js';
import type { IAgentExecutor } from '../../../../application/ports/output/agents/agent-executor.interface.js';
import type { ISettingsRepository } from '../../../../application/ports/output/repositories/settings.repository.interface.js';

export class AgentExecutorProvider implements IAgentExecutorProvider {
  constructor(
    private readonly factory: IAgentExecutorFactory,
    private readonly settingsRepository: ISettingsRepository
  ) {}

  async getExecutor(): Promise<IAgentExecutor> {
    const settings = await this.settingsRepository.load();
    if (!settings) {
      throw new Error('Settings not found. Please run initialization first.');
    }
    return this.factory.createExecutor(settings.agent.type, settings.agent);
  }
}
