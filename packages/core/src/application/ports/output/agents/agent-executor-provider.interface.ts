import type { IAgentExecutor } from './agent-executor.interface.js';

export interface IAgentExecutorProvider {
  getExecutor(): IAgentExecutor;
}
