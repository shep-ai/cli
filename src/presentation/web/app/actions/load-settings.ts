'use server';

import { statSync } from 'node:fs';
import { join } from 'node:path';
import { resolve } from '@/lib/server-container';
import type { LoadSettingsUseCase } from '@shepai/core/application/use-cases/settings/load-settings.use-case';
import { getShepHomeDir } from '@shepai/core/infrastructure/services/filesystem/shep-directory.service';
import type { Settings } from '@shepai/core/domain/generated/output';

export interface LoadSettingsResult {
  settings?: Settings;
  shepHome?: string;
  dbFileSize?: string;
  error?: string;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export async function loadSettings(): Promise<LoadSettingsResult> {
  try {
    const useCase = resolve<LoadSettingsUseCase>('LoadSettingsUseCase');
    const settings = await useCase.execute();

    const shepHome = getShepHomeDir();
    let dbFileSize = 'Unknown';
    try {
      const dbPath = join(shepHome, 'data');
      const stat = statSync(dbPath);
      dbFileSize = formatFileSize(stat.size);
    } catch {
      // DB file may not exist yet
    }

    return { settings, shepHome, dbFileSize };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load settings';
    return { error: message };
  }
}
