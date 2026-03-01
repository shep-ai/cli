'use server';

import { existsSync } from 'node:fs';
import { resolve } from '@/lib/server-container';
import { createDeploymentLogger } from '@shepai/core/infrastructure/services/deployment/deployment-logger';
import { computeWorktreePath } from '@shepai/core/infrastructure/services/ide-launchers/compute-worktree-path';
import type { IFeatureRepository } from '@shepai/core/application/ports/output/repositories/feature-repository.interface';
import type { IDeploymentService } from '@shepai/core/application/ports/output/services/deployment-service.interface';
import { DeploymentState } from '@shepai/core/domain/generated/output';

const log = createDeploymentLogger('[deployFeature]');

export async function deployFeature(
  featureId: string
): Promise<{ success: boolean; error?: string; state?: DeploymentState }> {
  log.info(`called — featureId="${featureId}"`);

  if (!featureId?.trim()) {
    log.warn('rejected — featureId is empty');
    return { success: false, error: 'featureId is required' };
  }

  try {
    const featureRepo = resolve<IFeatureRepository>('IFeatureRepository');
    const feature = await featureRepo.findById(featureId);

    if (!feature) {
      log.warn(`feature not found in repository: "${featureId}"`);
      return { success: false, error: `Feature not found: ${featureId}` };
    }

    log.info(
      `feature found — repositoryPath="${feature.repositoryPath}", branch="${feature.branch}"`
    );

    const worktreePath = computeWorktreePath(feature.repositoryPath, feature.branch);
    log.info(`computed worktreePath="${worktreePath}"`);

    if (!existsSync(worktreePath)) {
      log.warn(`worktree path does not exist on disk: "${worktreePath}"`);
      return { success: false, error: `Worktree path does not exist: ${worktreePath}` };
    }

    log.info('worktree path exists, calling deploymentService.start()');
    const deploymentService = resolve<IDeploymentService>('IDeploymentService');
    deploymentService.start(featureId, worktreePath);

    log.info('start() returned successfully — state=Booting');
    return { success: true, state: DeploymentState.Booting };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to deploy feature';
    log.error(`error: ${message}`, error);
    return { success: false, error: message };
  }
}
