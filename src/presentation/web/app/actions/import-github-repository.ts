'use server';

import { resolve } from '@/lib/server-container';
import type { ImportGitHubRepositoryUseCase } from '@shepai/core/application/use-cases/repositories/import-github-repository.use-case';
import type { Repository } from '@shepai/core/domain/generated/output';
import {
  GitHubAuthError,
  GitHubUrlParseError,
  GitHubCloneError,
} from '@shepai/core/application/ports/output/services/github-repository-service.interface';

interface ImportGitHubRepositoryInput {
  url: string;
  dest?: string;
}

export async function importGitHubRepository(
  input: ImportGitHubRepositoryInput
): Promise<{ repository?: Repository; error?: string }> {
  const { url, dest } = input;

  if (!url?.trim()) {
    return { error: 'GitHub URL is required' };
  }

  try {
    const useCase = resolve<ImportGitHubRepositoryUseCase>('ImportGitHubRepositoryUseCase');
    const repository = await useCase.execute({ url, dest });
    return { repository };
  } catch (error: unknown) {
    if (error instanceof GitHubAuthError) {
      return { error: 'GitHub CLI is not authenticated. Run `gh auth login` to sign in.' };
    }
    if (error instanceof GitHubUrlParseError) {
      return { error: `Invalid GitHub URL: ${error.message}` };
    }
    if (error instanceof GitHubCloneError) {
      return { error: `Clone failed: ${error.message}` };
    }
    const message = error instanceof Error ? error.message : 'Failed to import repository';
    return { error: message };
  }
}
