'use server';

import { getSettings } from '@shepai/core/infrastructure/services/settings.service';

/**
 * Check whether onboarding has been completed.
 * Delegates to the in-memory settings singleton (zero DB overhead).
 */
export async function isAgentSetupComplete(): Promise<boolean> {
  try {
    return getSettings().onboardingComplete;
  } catch {
    return false;
  }
}
