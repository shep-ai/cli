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
import { getTuiI18n } from '../../i18n.js';
import { runAgentStep } from './steps/agent.step.js';
import { runIdeStep } from './steps/ide.step.js';
import { runWorkflowDefaultsStep } from './steps/workflow-defaults.step.js';
import type { AgentConfigResult } from '../agent-config.wizard.js';
import type { WorkflowDefaultsResult } from './types.js';

/**
 * Display the welcome banner before the first wizard step.
 */
function showWelcomeBanner(): void {
  const t = getTuiI18n().t;
  console.log();
  console.log(pc.cyan(pc.bold(`  ${t('tui:wizards.onboarding.welcomeTitle')}`)));
  console.log(pc.dim(`  ${t('tui:wizards.onboarding.welcomeSubtitle')}`));
  console.log();
  console.log(
    pc.yellow(`  \u26a0 ${t('tui:wizards.onboarding.prerequisiteWarning')}`) +
      pc.bold(t('tui:wizards.onboarding.prerequisiteLabel')) +
      pc.dim(` ${t('tui:wizards.onboarding.prerequisiteDescription')}`)
  );
  console.log(
    pc.dim(`  ${t('tui:wizards.onboarding.installFrom')}`) +
      pc.underline(t('tui:wizards.onboarding.installUrl'))
  );
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
    console.log(pc.green(`  \u2713 ${getTuiI18n().t('tui:wizards.onboarding.setupComplete')}`));
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
