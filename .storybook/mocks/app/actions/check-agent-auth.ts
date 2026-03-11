export async function checkAgentAuth() {
  return {
    agentType: 'claude-code',
    installed: true,
    authenticated: true,
    label: 'Claude Code',
    binaryName: 'claude',
    authCommand: null,
  };
}
