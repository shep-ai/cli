'use server';
/* eslint-disable no-console */

import { existsSync } from 'node:fs';
import { resolve } from '@/lib/server-container';
import type { IDeploymentService } from '@shepai/core/application/ports/output/services/deployment-service.interface';
import { DeploymentState } from '@shepai/core/domain/generated/output';

const LOG_PREFIX = '[deployRepository]';

export async function deployRepository(
  repositoryPath: string
): Promise<{ success: boolean; error?: string; state?: DeploymentState }> {
  console.info(`${LOG_PREFIX} called — repositoryPath="${repositoryPath}"`);

  if (!repositoryPath?.startsWith('/')) {
    console.warn(`${LOG_PREFIX} rejected — not an absolute path`);
    return { success: false, error: 'repositoryPath must be an absolute path' };
  }

  try {
    if (!existsSync(repositoryPath)) {
      console.warn(`${LOG_PREFIX} directory does not exist: "${repositoryPath}"`);
      return { success: false, error: `Directory does not exist: ${repositoryPath}` };
    }

    console.info(`${LOG_PREFIX} directory exists, calling deploymentService.start()`);
    const deploymentService = resolve<IDeploymentService>('IDeploymentService');
    deploymentService.start(repositoryPath, repositoryPath);

    console.info(`${LOG_PREFIX} start() returned successfully — state=Booting`);
    return { success: true, state: DeploymentState.Booting };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to deploy repository';
    console.error(`${LOG_PREFIX} error: ${message}`, error);
    return { success: false, error: message };
  }
}
