'use server';

import { revalidatePath } from 'next/cache';
import { resolve } from '@/lib/server-container';
import type { LoadSettingsUseCase } from '@shepai/core/application/use-cases/settings/load-settings.use-case';
import type { UpdateSettingsUseCase } from '@shepai/core/application/use-cases/settings/update-settings.use-case';
import { updateSettings as updateSettingsSingleton } from '@shepai/core/infrastructure/services/settings.service';
import type { SkillSource } from '@shepai/core/domain/generated/output';

export interface AddInjectedSkillResult {
  success: boolean;
  error?: string;
}

export async function addInjectedSkill(skill: SkillSource): Promise<AddInjectedSkillResult> {
  try {
    const loadUseCase = resolve<LoadSettingsUseCase>('LoadSettingsUseCase');
    const current = await loadUseCase.execute();

    const existingSkills = current.workflow.skillInjection?.skills ?? [];
    if (existingSkills.some((s) => s.name === skill.name)) {
      return { success: false, error: `Skill "${skill.name}" is already configured` };
    }

    const updated = {
      ...current,
      workflow: {
        ...current.workflow,
        skillInjection: {
          enabled: current.workflow.skillInjection?.enabled ?? true,
          skills: [...existingSkills, skill],
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
    const message = error instanceof Error ? error.message : 'Failed to add skill';
    return { success: false, error: message };
  }
}
