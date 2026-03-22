'use server';

import { resolve } from '@/lib/server-container';
import type { SyncRepositoryMainUseCase } from '@shepai/core/application/use-cases/repositories/sync-repository-main.use-case';

export async function syncRepository(
  repositoryId: string
): Promise<{ success: boolean; error?: string }> {
  if (!repositoryId?.trim()) {
    return { success: false, error: 'Repository id is required' };
  }

  try {
    const useCase = resolve<SyncRepositoryMainUseCase>('SyncRepositoryMainUseCase');
    await useCase.execute(repositoryId);
    return { success: true };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to sync repository';
    return { success: false, error: message };
  }
}
