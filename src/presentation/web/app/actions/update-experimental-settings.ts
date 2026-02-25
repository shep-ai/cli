'use server';

import { getSettings } from '@shepai/core/infrastructure/services/settings.service';
import { EXPERIMENTAL_FLAGS } from '@shepai/core/domain/constants/experimental-flags';
import type { ExperimentalFlagKey } from '@shepai/core/domain/constants/experimental-flags';
import { resolve } from '@/lib/server-container';
import { UpdateSettingsUseCase } from '@shepai/core/application/use-cases/settings/update-settings.use-case';

/**
 * Update a single experimental feature flag.
 *
 * Mutates the in-memory Settings singleton, updates the timestamp,
 * and persists via UpdateSettingsUseCase.
 */
export async function updateExperimentalSetting(
  flagName: string,
  value: boolean
): Promise<{ success: boolean; error?: string }> {
  // Validate flag name against the registry
  if (!(flagName in EXPERIMENTAL_FLAGS)) {
    const validFlags = Object.keys(EXPERIMENTAL_FLAGS).join(', ');
    return {
      success: false,
      error: `Unknown experimental flag '${flagName}'. Valid flags: ${validFlags}`,
    };
  }

  try {
    const settings = getSettings();
    const key = flagName as ExperimentalFlagKey;

    // Mutate the in-memory singleton directly
    settings.experimental[key] = value;
    settings.updatedAt = new Date();

    // Persist via use case
    const useCase = resolve<UpdateSettingsUseCase>(UpdateSettingsUseCase);
    await useCase.execute(settings);

    return { success: true };
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Failed to update experimental setting';
    return { success: false, error: message };
  }
}
