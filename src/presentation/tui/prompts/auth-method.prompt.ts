/**
 * Auth Method Prompt Configuration
 *
 * Configuration for the @inquirer/select prompt that lets users
 * choose their authentication method for the selected agent.
 */

import { AgentAuthMethod } from '@/domain/generated/output.js';
import { shepTheme } from '../themes/shep.theme.js';

/**
 * Creates the @inquirer/select configuration for selecting an authentication method.
 *
 * Users can choose between session-based auth (built into the agent CLI)
 * or token-based auth (providing an API key).
 */
export function createAuthMethodConfig() {
  return {
    message: 'Select authentication method',
    choices: [
      {
        name: 'Use existing session',
        value: AgentAuthMethod.Session,
        description: 'Use Claude Code built-in authentication',
      },
      {
        name: 'Use API token',
        value: AgentAuthMethod.Token,
        description: 'Provide an Anthropic API key',
      },
    ],
    theme: shepTheme,
  } as const;
}
