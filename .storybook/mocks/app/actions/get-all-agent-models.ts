export async function getAllAgentModels() {
  return [
    { agentType: 'claude-code', label: 'Claude Code', models: ['claude-opus-4-6', 'claude-sonnet-4-6', 'claude-haiku-4-5'] },
    { agentType: 'cursor', label: 'Cursor CLI', models: ['claude-opus-4-6', 'claude-sonnet-4-6', 'gpt-5.4', 'gpt-5', 'gpt-5.3-codex', 'gemini-3.1-pro', 'composer-1.5', 'grok-code'] },
    { agentType: 'gemini-cli', label: 'Gemini CLI', models: ['gemini-3.1-pro', 'gemini-3-flash', 'gemini-2.5-pro', 'gemini-2.5-flash'] },
    { agentType: 'dev', label: 'Demo', models: [] },
  ];
}
