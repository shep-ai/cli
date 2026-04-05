'use server';

import { revalidatePath } from 'next/cache';
import { resolve } from '@/lib/server-container';
import type { LoadSettingsUseCase } from '@shepai/core/application/use-cases/settings/load-settings.use-case';
import type { UpdateSettingsUseCase } from '@shepai/core/application/use-cases/settings/update-settings.use-case';
import { updateSettings as updateSettingsSingleton } from '@shepai/core/infrastructure/services/settings.service';

export interface RemoveInjectedSkillResult {
  success: boolean;
  error?: string;
}

export async function removeInjectedSkill(skillName: string): Promise<RemoveInjectedSkillResult> {
  try {
    const loadUseCase = resolve<LoadSettingsUseCase>('LoadSettingsUseCase');
    const current = await loadUseCase.execute();

    const existingSkills = current.workflow.skillInjection?.skills ?? [];
    const filtered = existingSkills.filter((s) => s.name !== skillName);

    if (filtered.length === existingSkills.length) {
      return { success: false, error: `Skill "${skillName}" not found in configuration` };
    }

    const updated = {
      ...current,
      workflow: {
        ...current.workflow,
        skillInjection: {
          enabled: current.workflow.skillInjection?.enabled ?? false,
          skills: filtered,
        },
      },
      updatedAt: new Date(),
    };

    const updateUseCase = resolve<UpdateSettingsUseCase>('UpdateSettingsUseCase');
    await updateUseCase.execute(updated);
    updateSettingsSingleton(updated);
    revalidatePath('/skills');

    return { success: true };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to remove skill';
    return { success: false, error: message };
  }
}
