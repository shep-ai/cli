/**
 * Agent Configuration Wizard
 *
 * Interactive TUI wizard that guides users through selecting
 * an AI coding agent and configuring authentication.
 */

import { select, password } from '@inquirer/prompts';

import { AgentAuthMethod, type AgentType } from '@/domain/generated/output.js';
import { createAgentSelectConfig } from '../prompts/agent-select.prompt.js';
import { createAuthMethodConfig } from '../prompts/auth-method.prompt.js';
import { shepTheme } from '../themes/shep.theme.js';

/**
 * Result returned by the agent configuration wizard.
 */
export interface AgentConfigResult {
  type: AgentType;
  authMethod: AgentAuthMethod;
  token?: string;
}

/**
 * Runs the interactive agent configuration wizard.
 *
 * Steps:
 * 1. Select an AI coding agent (only Claude Code is currently enabled)
 * 2. Select an authentication method (session or token)
 * 3. If token auth is selected, prompt for the API key
 *
 * @returns The selected agent configuration
 */
export async function agentConfigWizard(): Promise<AgentConfigResult> {
  const agentType = await select<AgentType>(createAgentSelectConfig());

  const authMethod = await select<AgentAuthMethod>(createAuthMethodConfig());

  const result: AgentConfigResult = {
    type: agentType,
    authMethod,
  };

  if (authMethod === AgentAuthMethod.Token) {
    const token = await password({
      message: 'Enter your Anthropic API key',
      mask: '*',
      theme: shepTheme,
    });
    result.token = token;
  }

  return result;
}
