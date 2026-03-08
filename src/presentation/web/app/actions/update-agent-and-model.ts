'use server';

import { resolve } from '@/lib/server-container';
import {
  getSettings,
  resetSettings,
  initializeSettings,
} from '@shepai/core/infrastructure/services/settings.service';
import type { UpdateSettingsUseCase } from '@shepai/core/application/use-cases/settings/update-settings.use-case';

export async function updateAgentAndModel(
  agentType: string,
  model: string | null
): Promise<{ ok: boolean; error?: string }> {
  if (!agentType.trim()) {
    return { ok: false, error: 'agent type is required' };
  }

  try {
    const currentSettings = getSettings();
    const updatedSettings = {
      ...currentSettings,
      agent: { ...currentSettings.agent, type: agentType.trim() as typeof currentSettings.agent.type },
      models: { default: model?.trim() || currentSettings.models.default },
    };

    const updateUseCase = resolve<UpdateSettingsUseCase>('UpdateSettingsUseCase');
    await updateUseCase.execute(updatedSettings);

    resetSettings();
    initializeSettings(updatedSettings);

    return { ok: true };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update agent and model';
    return { ok: false, error: message };
  }
}
