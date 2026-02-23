/**
 * Check Onboarding Status Use Case
 *
 * Reads the in-memory settings singleton and returns whether
 * first-run onboarding has been completed.
 */

import { getSettings } from '../../../infrastructure/services/settings.service.js';

/**
 * Use case for checking whether onboarding is complete.
 * Reads from the in-memory singleton (zero DB overhead).
 */
export class CheckOnboardingStatusUseCase {
  async execute(): Promise<{ isComplete: boolean }> {
    const settings = getSettings();
    return { isComplete: settings.onboardingComplete };
  }
}
