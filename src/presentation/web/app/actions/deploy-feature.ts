'use server';
/* eslint-disable no-console */

import { existsSync } from 'node:fs';
import { resolve } from '@/lib/server-container';
import { computeWorktreePath } from '@shepai/core/infrastructure/services/ide-launchers/compute-worktree-path';
import type { IFeatureRepository } from '@shepai/core/application/ports/output/repositories/feature-repository.interface';
import type { IDeploymentService } from '@shepai/core/application/ports/output/services/deployment-service.interface';
import { DeploymentState } from '@shepai/core/domain/generated/output';

const LOG_PREFIX = '[deployFeature]';

export async function deployFeature(
  featureId: string
): Promise<{ success: boolean; error?: string; state?: DeploymentState }> {
  console.info(`${LOG_PREFIX} called — featureId="${featureId}"`);

  if (!featureId?.trim()) {
    console.warn(`${LOG_PREFIX} rejected — featureId is empty`);
    return { success: false, error: 'featureId is required' };
  }

  try {
    const featureRepo = resolve<IFeatureRepository>('IFeatureRepository');
    const feature = await featureRepo.findById(featureId);

    if (!feature) {
      console.warn(`${LOG_PREFIX} feature not found in repository: "${featureId}"`);
      return { success: false, error: `Feature not found: ${featureId}` };
    }

    console.info(
      `${LOG_PREFIX} feature found — repositoryPath="${feature.repositoryPath}", branch="${feature.branch}"`
    );

    const worktreePath = computeWorktreePath(feature.repositoryPath, feature.branch);
    console.info(`${LOG_PREFIX} computed worktreePath="${worktreePath}"`);

    if (!existsSync(worktreePath)) {
      console.warn(`${LOG_PREFIX} worktree path does not exist on disk: "${worktreePath}"`);
      return { success: false, error: `Worktree path does not exist: ${worktreePath}` };
    }

    console.info(`${LOG_PREFIX} worktree path exists, calling deploymentService.start()`);
    const deploymentService = resolve<IDeploymentService>('IDeploymentService');
    deploymentService.start(featureId, worktreePath);

    console.info(`${LOG_PREFIX} start() returned successfully — state=Booting`);
    return { success: true, state: DeploymentState.Booting };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to deploy feature';
    console.error(`${LOG_PREFIX} error: ${message}`, error);
    return { success: false, error: message };
  }
}
