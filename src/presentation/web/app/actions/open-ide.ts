'use server';

import { getSettings } from '@shepai/core/infrastructure/services/settings.service';
import { launchIde } from '@shepai/core/infrastructure/services/ide-launchers/launch-ide';

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

  const result = await launchIde({
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
