'use server';

import { resolve } from '@/lib/server-container';
import type { GetRepositoryCommitsUseCase } from '@shepai/core/application/use-cases/repositories/get-repository-commits.use-case';
import type { CommitInfo } from '@shepai/core/application/ports/output/services/git-pr-service.interface';

export type { CommitInfo };

export interface RepositoryCommitsData {
  commits: CommitInfo[];
  currentBranch: string;
  defaultBranch: string;
}

export async function getRepositoryCommits(
  repositoryPath: string,
  branch?: string,
  limit = 50
): Promise<{ success: boolean; data?: RepositoryCommitsData; error?: string }> {
  if (!repositoryPath?.trim()) {
    return { success: false, error: 'Repository path is required' };
  }

  try {
    const useCase = resolve<GetRepositoryCommitsUseCase>('GetRepositoryCommitsUseCase');
    const result = await useCase.execute(repositoryPath, branch, limit);
    return { success: true, data: result };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get commit history';
    return { success: false, error: message };
  }
}
