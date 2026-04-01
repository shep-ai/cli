/**
 * Auth Method Prompt Configuration
 *
 * Configuration for the @inquirer/select prompt that lets users
 * choose their authentication method for the selected agent.
 */

import { AgentAuthMethod } from '@/domain/generated/output.js';
import { getTuiI18n } from '../i18n.js';
import { shepTheme } from '../themes/shep.theme.js';

/**
 * Creates the @inquirer/select configuration for selecting an authentication method.
 *
 * Users can choose between session-based auth (built into the agent CLI)
 * or token-based auth (providing an API key).
 */
export function createAuthMethodConfig() {
  const t = getTuiI18n().t;
  return {
    message: t('tui:prompts.selectAuthMethod.message'),
    choices: [
      {
        name: t('tui:prompts.selectAuthMethod.choices.session.name'),
        value: AgentAuthMethod.Session,
        description: t('tui:prompts.selectAuthMethod.choices.session.description'),
      },
      {
        name: t('tui:prompts.selectAuthMethod.choices.token.name'),
        value: AgentAuthMethod.Token,
        description: t('tui:prompts.selectAuthMethod.choices.token.description'),
      },
    ],
    theme: shepTheme,
  };
}
