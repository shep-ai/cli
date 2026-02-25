'use server';

import { existsSync } from 'node:fs';
import { resolve } from '@/lib/server-container';
import { computeWorktreePath } from '@shepai/core/infrastructure/services/ide-launchers/compute-worktree-path';
import type { IFeatureRepository } from '@shepai/core/application/ports/output/repositories/feature-repository.interface';
import type { IDeploymentService } from '@shepai/core/application/ports/output/services/deployment-service.interface';
import { DeploymentState } from '@shepai/core/domain/generated/output';

export async function deployFeature(
  featureId: string
): Promise<{ success: boolean; error?: string; state?: DeploymentState }> {
  if (!featureId?.trim()) {
    return { success: false, error: 'featureId is required' };
  }

  try {
    const featureRepo = resolve<IFeatureRepository>('IFeatureRepository');
    const feature = await featureRepo.findById(featureId);

    if (!feature) {
      return { success: false, error: `Feature not found: ${featureId}` };
    }

    const worktreePath = computeWorktreePath(feature.repositoryPath, feature.branch);

    if (!existsSync(worktreePath)) {
      return { success: false, error: `Worktree path does not exist: ${worktreePath}` };
    }

    const deploymentService = resolve<IDeploymentService>('IDeploymentService');
    deploymentService.start(featureId, worktreePath);

    return { success: true, state: DeploymentState.Booting };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to deploy feature';
    return { success: false, error: message };
  }
}
