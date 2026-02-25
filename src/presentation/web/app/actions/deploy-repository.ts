'use server';

import { existsSync } from 'node:fs';
import { resolve } from '@/lib/server-container';
import type { IDeploymentService } from '@shepai/core/application/ports/output/services/deployment-service.interface';
import { DeploymentState } from '@shepai/core/domain/generated/output';

export async function deployRepository(
  repositoryPath: string
): Promise<{ success: boolean; error?: string; state?: DeploymentState }> {
  if (!repositoryPath?.startsWith('/')) {
    return { success: false, error: 'repositoryPath must be an absolute path' };
  }

  try {
    if (!existsSync(repositoryPath)) {
      return { success: false, error: `Directory does not exist: ${repositoryPath}` };
    }

    const deploymentService = resolve<IDeploymentService>('IDeploymentService');
    deploymentService.start(repositoryPath, repositoryPath);

    return { success: true, state: DeploymentState.Booting };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to deploy repository';
    return { success: false, error: message };
  }
}
