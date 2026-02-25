'use server';

import { resolve } from '@/lib/server-container';
import type { AddRepositoryUseCase } from '@shepai/core/application/use-cases/repositories/add-repository.use-case';
import type { Repository } from '@shepai/core/domain/generated/output';

interface AddRepositoryInput {
  path: string;
  name?: string;
}

export async function addRepository(
  input: AddRepositoryInput
): Promise<{ repository?: Repository; error?: string }> {
  const { path, name } = input;

  if (!path?.trim()) {
    return { error: 'path is required' };
  }

  try {
    const addRepoUseCase = resolve<AddRepositoryUseCase>('AddRepositoryUseCase');
    const repository = await addRepoUseCase.execute({ path, name });
    return { repository };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to add repository';
    return { error: message };
  }
}
