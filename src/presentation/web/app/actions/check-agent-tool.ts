'use server';

import { resolve } from '@/lib/server-container';
import type { ListToolsUseCase } from '@shepai/core/application/use-cases/tools/list-tools.use-case';
import type { ToolItem } from '@shepai/core/application/use-cases/tools/list-tools.use-case';

/**
 * Maps agent types to their corresponding tool IDs in the tool registry.
 * These IDs match the JSON file names in tool-installer/tools/.
 */
const AGENT_TOOL_MAP: Record<string, string> = {
  'claude-code': 'claude-code',
  cursor: 'cursor-cli',
  'gemini-cli': 'gemini-cli',
};

/** CLI binary names matching the `binary` field in each tool JSON */
const AGENT_BINARY_MAP: Record<string, string> = {
  'claude-code': 'claude',
  cursor: 'cursor',
  'gemini-cli': 'gemini',
};

export interface AgentToolStatus {
  agentType: string;
  toolId: string | null;
  tool: ToolItem | null;
  installed: boolean;
  /** CLI binary name for manual run instructions (e.g. "claude", "gemini") */
  binaryName: string | null;
}

export async function checkAgentTool(agentType: string): Promise<AgentToolStatus> {
  const toolId = AGENT_TOOL_MAP[agentType] ?? null;
  const binaryName = AGENT_BINARY_MAP[agentType] ?? null;

  // Dev agent and unknown agents don't need a tool
  if (!toolId) {
    return { agentType, toolId: null, tool: null, installed: true, binaryName: null };
  }

  try {
    const useCase = resolve<ListToolsUseCase>('ListToolsUseCase');
    const tools = await useCase.execute();
    const tool = tools.find((t) => t.id === toolId) ?? null;
    const installed = tool?.status.status === 'available';

    return { agentType, toolId, tool, installed, binaryName };
  } catch {
    return { agentType, toolId, tool: null, installed: false, binaryName };
  }
}
