/**
 * Onboarding Step 1: Agent Configuration
 *
 * Wraps the existing agentConfigWizard() for use in the onboarding flow.
 */

import { agentConfigWizard, type AgentConfigResult } from '../../agent-config.wizard.js';

/**
 * Runs the agent configuration step.
 * Delegates to the existing agentConfigWizard.
 */
export async function runAgentStep(): Promise<AgentConfigResult> {
  return agentConfigWizard();
}
