'use server';

import { resolve } from '@/lib/server-container';
import type { AdoptBranchUseCase } from '@shepai/core/application/use-cases/features/adopt-branch.use-case';
import type { Feature } from '@shepai/core/domain/generated/output';

interface AdoptBranchInput {
  branchName: string;
  repositoryPath: string;
}

export async function adoptBranch(
  input: AdoptBranchInput
): Promise<{ feature?: Feature; error?: string }> {
  const { branchName, repositoryPath } = input;

  if (!branchName?.trim()) {
    return { error: 'Branch name is required' };
  }
  if (!repositoryPath?.trim()) {
    return { error: 'Repository path is required' };
  }

  try {
    const useCase = resolve<AdoptBranchUseCase>('AdoptBranchUseCase');
    const result = await useCase.execute({ branchName, repositoryPath });
    return { feature: result.feature };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to adopt branch';
    return { error: message };
  }
}
