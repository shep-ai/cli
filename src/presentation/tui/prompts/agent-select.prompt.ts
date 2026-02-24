/**
 * Agent Select Prompt Configuration
 *
 * Configuration for the @inquirer/select prompt that lets users
 * choose their AI coding agent.
 */

import { AgentType } from '@/domain/generated/output.js';
import { shepTheme } from '../themes/shep.theme.js';

/**
 * Creates the @inquirer/select configuration for selecting an AI coding agent.
 *
 * Only Claude Code is currently available. Other agents are shown as
 * disabled with a "Coming Soon" badge.
 */
export function createAgentSelectConfig() {
  return {
    message: 'Select your AI coding agent',
    choices: [
      {
        name: 'Claude Code',
        value: AgentType.ClaudeCode,
        description: 'Anthropic Claude Code CLI',
      },
      {
        name: 'Gemini CLI',
        value: AgentType.GeminiCli,
        description: 'Google Gemini CLI',
      },
      {
        name: 'Cursor',
        value: AgentType.Cursor,
        description: 'Cursor AI coding agent',
      },
      {
        name: 'Dev (Mock)',
        value: AgentType.Dev,
        description: 'Local development mock — no agent binary required',
      },
      {
        name: 'Aider',
        value: AgentType.Aider,
        disabled: '(Coming Soon)',
      },
      {
        name: 'Continue',
        value: AgentType.Continue,
        disabled: '(Coming Soon)',
      },
    ],
    theme: shepTheme,
  } as const;
}
