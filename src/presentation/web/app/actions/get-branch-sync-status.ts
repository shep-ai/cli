'use server';

import { resolve } from '@/lib/server-container';
import type { GetBranchSyncStatusUseCase } from '@shepai/core/application/use-cases/features/get-branch-sync-status.use-case';

export async function getBranchSyncStatus(featureId: string): Promise<{
  success: boolean;
  data?: { ahead: number; behind: number; baseBranch: string; checkedAt: string };
  error?: string;
}> {
  if (!featureId?.trim()) {
    return { success: false, error: 'Feature id is required' };
  }

  try {
    const useCase = resolve<GetBranchSyncStatusUseCase>('GetBranchSyncStatusUseCase');
    const result = await useCase.execute(featureId);
    return {
      success: true,
      data: {
        ...result,
        checkedAt: new Date().toISOString(),
      },
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to get branch sync status';
    return { success: false, error: message };
  }
}
