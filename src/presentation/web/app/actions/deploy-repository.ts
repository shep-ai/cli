'use server';

import { existsSync } from 'node:fs';
import { isAbsolute } from 'node:path';
import { resolve } from '@/lib/server-container';
import { createDeploymentLogger } from '@shepai/core/infrastructure/services/deployment/deployment-logger';
import type { IAgentDeploymentService } from '@shepai/core/application/ports/output/services/agent-deployment-service.interface';
import type { DeploymentState } from '@shepai/core/domain/generated/output';

const log = createDeploymentLogger('[deployRepository]');

export async function deployRepository(
  repositoryPath: string
): Promise<{ success: boolean; error?: string; state?: DeploymentState; reason?: string }> {
  log.info(`called — repositoryPath="${repositoryPath}"`);

  if (!repositoryPath || !isAbsolute(repositoryPath)) {
    log.warn('rejected — not an absolute path');
    return { success: false, error: 'repositoryPath must be an absolute path' };
  }

  try {
    if (!existsSync(repositoryPath)) {
      log.warn(`directory does not exist: "${repositoryPath}"`);
      return { success: false, error: `Directory does not exist: ${repositoryPath}` };
    }

    log.info('directory exists, calling agentDeploymentService.deploy()');
    const agentDeploymentService = resolve<IAgentDeploymentService>('IAgentDeploymentService');
    const result = await agentDeploymentService.deploy(repositoryPath, repositoryPath);

    if (!result.success) {
      log.warn(`agent deployment returned not-deployable: ${result.error}`);
      return { success: false, error: result.error, reason: result.analysis?.reason };
    }

    log.info('deploy() returned successfully — state=Booting');
    return { success: true, state: result.state };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to deploy repository';
    log.error(`error: ${message}`, error);
    return { success: false, error: message };
  }
}
