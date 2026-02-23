/**
 * Onboarding Step 2: IDE Selection
 *
 * Wraps the existing IDE select prompt for use in the onboarding flow.
 */

import { select } from '@inquirer/prompts';
import { createIdeSelectConfig } from '../../../prompts/ide-select.prompt.js';

/**
 * Runs the IDE selection step.
 * Delegates to the existing IDE select config.
 */
export async function runIdeStep(): Promise<string> {
  return select(createIdeSelectConfig());
}
