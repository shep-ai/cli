const defaultResult = {
  agentType: 'claude-code',
  installed: true,
  authenticated: true,
  label: 'Claude Code',
  binaryName: 'claude',
  installCommand: 'curl -fsSL https://claude.ai/install.sh | bash',
  authCommand: null,
};

/** Override in stories via `window.__mockAgentAuth` */
export async function checkAgentAuth() {
  const win = globalThis as Record<string, unknown>;
  if (win.__mockAgentAuth) return win.__mockAgentAuth;
  return defaultResult;
}
