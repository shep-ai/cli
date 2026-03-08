'use server';

import { revalidatePath } from 'next/cache';
import { resolve } from '@/lib/server-container';
import type { LoadSettingsUseCase } from '@shepai/core/application/use-cases/settings/load-settings.use-case';
import type { UpdateSettingsUseCase } from '@shepai/core/application/use-cases/settings/update-settings.use-case';
import { updateSettings as updateSettingsSingleton } from '@shepai/core/infrastructure/services/settings.service';
import type { Settings } from '@shepai/core/domain/generated/output';

type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K];
};

function deepMerge<T extends Record<string, unknown>>(target: T, source: DeepPartial<T>): T {
  const result = { ...target };
  for (const key of Object.keys(source) as (keyof T)[]) {
    const sourceVal = source[key];
    if (sourceVal === undefined) continue;

    const targetVal = target[key];
    if (
      targetVal !== null &&
      targetVal !== undefined &&
      typeof targetVal === 'object' &&
      !Array.isArray(targetVal) &&
      !(targetVal instanceof Date) &&
      sourceVal !== null &&
      typeof sourceVal === 'object' &&
      !Array.isArray(sourceVal) &&
      !(sourceVal instanceof Date)
    ) {
      result[key] = deepMerge(
        targetVal as Record<string, unknown>,
        sourceVal as DeepPartial<Record<string, unknown>>
      ) as T[keyof T];
    } else {
      result[key] = sourceVal as T[keyof T];
    }
  }
  return result;
}

export interface UpdateSettingsResult {
  success: boolean;
  error?: string;
}

export async function updateSettingsAction(
  partial: DeepPartial<Settings>
): Promise<UpdateSettingsResult> {
  try {
    const loadUseCase = resolve<LoadSettingsUseCase>('LoadSettingsUseCase');
    const current = await loadUseCase.execute();

    const merged = deepMerge(
      current as unknown as Record<string, unknown>,
      partial as DeepPartial<Record<string, unknown>>
    ) as Settings;
    merged.updatedAt = new Date();

    const updateUseCase = resolve<UpdateSettingsUseCase>('UpdateSettingsUseCase');
    await updateUseCase.execute(merged);

    updateSettingsSingleton(merged);

    revalidatePath('/', 'layout');

    return { success: true };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update settings';
    return { success: false, error: message };
  }
}
