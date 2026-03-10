export async function checkAgentTool(agentType: string) {
  const toolMap: Record<string, string> = {
    'claude-code': 'claude-code',
    cursor: 'cursor-cli',
    'gemini-cli': 'gemini-cli',
  };
  const toolId = toolMap[agentType] ?? null;

  if (!toolId) {
    return { agentType, toolId: null, tool: null, installed: true };
  }

  return {
    agentType,
    toolId,
    tool: {
      id: toolId,
      name:
        agentType === 'claude-code'
          ? 'Claude Code'
          : agentType === 'cursor'
            ? 'Cursor CLI'
            : 'Gemini CLI',
      summary: 'AI-powered coding agent',
      description: 'Mock tool for Storybook',
      tags: ['cli-agent'],
      iconUrl: undefined,
      autoInstall: true,
      required: false,
      openDirectory: undefined,
      documentationUrl: 'https://example.com',
      installCommand: 'npm install -g mock-tool',
      status: { status: 'available', toolName: toolId },
      author: 'Mock',
      website: undefined,
      platforms: ['linux', 'darwin'],
    },
    installed: true,
  };
}
