'use server';

import { resolve } from '@/lib/server-container';
import type { IAgentExecutorFactory } from '@shepai/core/application/ports/output/agents/agent-executor-factory.interface';

export interface AgentModelGroup {
  agentType: string;
  label: string;
  models: string[];
}

const AGENT_LABELS: Record<string, string> = {
  'claude-code': 'Claude Code',
  cursor: 'Cursor CLI',
  'gemini-cli': 'Gemini CLI',
  dev: 'Demo',
};

export async function getAllAgentModels(): Promise<AgentModelGroup[]> {
  try {
    const factory = resolve<IAgentExecutorFactory>('IAgentExecutorFactory');
    const agents = factory.getSupportedAgents();
    return agents
      .map((agentType) => ({
        agentType: agentType as string,
        label: AGENT_LABELS[agentType as string] ?? (agentType as string),
        models: factory.getSupportedModels(agentType),
      }))
      .filter((g) => g.models.length > 0 || g.agentType === 'dev');
  } catch {
    return [];
  }
}
