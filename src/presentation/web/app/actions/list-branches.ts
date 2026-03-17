'use server';

import { resolve } from '@/lib/server-container';
import type { IWorktreeService } from '@shepai/core/application/ports/output/services/worktree-service.interface';

/**
 * Server action that returns all branch names (local + remote) for a repository.
 * Used by the adopt branch drawer to populate the branch combobox.
 */
export async function listBranches(repositoryPath: string): Promise<string[]> {
  if (!repositoryPath?.trim()) {
    return [];
  }

  try {
    const worktreeService = resolve<IWorktreeService>('IWorktreeService');
    return await worktreeService.listBranches(repositoryPath);
  } catch {
    return [];
  }
}
