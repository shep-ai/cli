'use server';

import { resolve } from '@/lib/server-container';
import type { LoadSettingsUseCase } from '@shepai/core/application/use-cases/settings/load-settings.use-case';
import type { UpdateSettingsUseCase } from '@shepai/core/application/use-cases/settings/update-settings.use-case';
import type { Settings } from '@shepai/core/domain/generated/output';

type SettingsSection =
  | 'models'
  | 'agent'
  | 'workflow'
  | 'user'
  | 'environment'
  | 'notifications'
  | 'system';

interface UpdateSettingsInput {
  section: SettingsSection;
  data: Record<string, unknown>;
}

export async function updateSettings(
  input: UpdateSettingsInput
): Promise<{ data?: Settings; error?: string }> {
  try {
    const loadUseCase = resolve<LoadSettingsUseCase>('LoadSettingsUseCase');
    const current = await loadUseCase.execute();

    const merged: Settings = {
      ...current,
      [input.section]: {
        ...current[input.section],
        ...input.data,
      },
    };

    const updateUseCase = resolve<UpdateSettingsUseCase>('UpdateSettingsUseCase');
    const updated = await updateUseCase.execute(merged);

    return { data: updated };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update settings';
    return { error: message };
  }
}
