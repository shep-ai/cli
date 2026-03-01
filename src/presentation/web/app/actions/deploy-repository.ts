'use server';

import { existsSync } from 'node:fs';
import { resolve } from '@/lib/server-container';
import { createDeploymentLogger } from '@shepai/core/infrastructure/services/deployment/deployment-logger';
import type { IDeploymentService } from '@shepai/core/application/ports/output/services/deployment-service.interface';
import { DeploymentState } from '@shepai/core/domain/generated/output';

const log = createDeploymentLogger('[deployRepository]');

export async function deployRepository(
  repositoryPath: string
): Promise<{ success: boolean; error?: string; state?: DeploymentState }> {
  log.info(`called — repositoryPath="${repositoryPath}"`);

  if (!repositoryPath?.startsWith('/')) {
    log.warn('rejected — not an absolute path');
    return { success: false, error: 'repositoryPath must be an absolute path' };
  }

  try {
    if (!existsSync(repositoryPath)) {
      log.warn(`directory does not exist: "${repositoryPath}"`);
      return { success: false, error: `Directory does not exist: ${repositoryPath}` };
    }

    log.info('directory exists, calling deploymentService.start()');
    const deploymentService = resolve<IDeploymentService>('IDeploymentService');
    deploymentService.start(repositoryPath, repositoryPath);

    log.info('start() returned successfully — state=Booting');
    return { success: true, state: DeploymentState.Booting };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to deploy repository';
    log.error(`error: ${message}`, error);
    return { success: false, error: message };
  }
}
