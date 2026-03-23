'use server';

import { resolve } from '@/lib/server-container';
import type { IGitHubRepositoryService } from '@shepai/core/application/ports/output/services/github-repository-service.interface';

/** Permissions that grant direct push access to a repository. */
const PUSH_PERMISSIONS = new Set(['ADMIN', 'MAINTAIN', 'WRITE']);

export async function getViewerPermission(repoPath: string): Promise<{ canPushDirectly: boolean }> {
  try {
    const service = resolve<IGitHubRepositoryService>('IGitHubRepositoryService');
    const permission = await service.getViewerPermission(repoPath);
    return { canPushDirectly: PUSH_PERMISSIONS.has(permission) };
  } catch {
    return { canPushDirectly: false };
  }
}
