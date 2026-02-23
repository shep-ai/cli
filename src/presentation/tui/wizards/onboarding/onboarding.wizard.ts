/* eslint-disable no-console */
/**
 * Onboarding Wizard Orchestrator
 *
 * Composes the 3 onboarding steps in sequence with a welcome banner.
 * After all steps, persists results via CompleteOnboardingUseCase
 * and refreshes the in-memory settings singleton.
 */

import pc from 'picocolors';
import { container } from '@/infrastructure/di/container.js';
import { CompleteOnboardingUseCase } from '@/application/use-cases/settings/complete-onboarding.use-case.js';
import { resetSettings, initializeSettings } from '@/infrastructure/services/settings.service.js';
import { runAgentStep } from './steps/agent.step.js';
import { runIdeStep } from './steps/ide.step.js';
import { runWorkflowDefaultsStep } from './steps/workflow-defaults.step.js';
import type { AgentConfigResult } from '../agent-config.wizard.js';
import type { WorkflowDefaultsResult } from './types.js';

/**
 * Display the welcome banner before the first wizard step.
 */
function showWelcomeBanner(): void {
  console.log();
  console.log(pc.cyan(pc.bold('  Welcome to Shep AI CLI')));
  console.log(pc.dim("  Let's set up your environment in 3 quick steps."));
  console.log();
}

/**
 * Runs the first-run onboarding wizard.
 *
 * Steps:
 * 1. Agent configuration (type + auth)
 * 2. IDE selection
 * 3. Workflow defaults (checkboxes)
 *
 * Step functions are injectable via parameters for testability.
 */
export async function onboardingWizard(
  agentStep: () => Promise<AgentConfigResult> = runAgentStep,
  ideStep: () => Promise<string> = runIdeStep,
  workflowStep: () => Promise<WorkflowDefaultsResult> = runWorkflowDefaultsStep
): Promise<void> {
  try {
    showWelcomeBanner();

    // Step 1: Agent configuration
    const agent = await agentStep();

    // Step 2: IDE selection
    const ide = await ideStep();

    // Step 3: Workflow defaults
    const workflowDefaults = await workflowStep();

    // Persist all wizard results atomically
    const useCase = container.resolve(CompleteOnboardingUseCase);
    const updatedSettings = await useCase.execute({
      agent,
      ide,
      workflowDefaults,
    });

    // Refresh in-memory settings singleton
    resetSettings();
    initializeSettings(updatedSettings);

    console.log();
    console.log(pc.green("  ✓ Setup complete! You're ready to use Shep."));
    console.log();
  } catch (error: unknown) {
    // Handle Ctrl+C gracefully (ExitPromptError from @inquirer/prompts)
    if (error && typeof error === 'object' && 'name' in error && error.name === 'ExitPromptError') {
      process.exit(0);
      return;
    }
    throw error;
  }
}
