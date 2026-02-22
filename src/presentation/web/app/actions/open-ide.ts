'use server';

import { getSettings } from '@shepai/core/infrastructure/services/settings.service';
import type { LaunchIdeUseCase } from '@shepai/core/application/use-cases/ide/launch-ide.use-case';
import { resolve } from '@/lib/server-container';

interface OpenIdeInput {
  repositoryPath: string;
  branch?: string;
}

export async function openIde(
  input: OpenIdeInput
): Promise<{ success: boolean; error?: string; editor?: string; path?: string }> {
  const { repositoryPath, branch } = input;

  if (!repositoryPath?.startsWith('/')) {
    return { success: false, error: 'repositoryPath must be an absolute path' };
  }

  const settings = getSettings();
  const editor = settings.environment.defaultEditor;

  const useCase = resolve<LaunchIdeUseCase>('LaunchIdeUseCase');
  const result = await useCase.execute({
    editorId: editor,
    repositoryPath,
    branch,
    checkAvailability: true,
  });

  if (!result.ok) {
    return { success: false, error: result.message };
  }

  return { success: true, editor: result.editorName, path: result.worktreePath };
}
