'use server';

import { existsSync } from 'node:fs';
import { resolve } from '@/lib/server-container';
import { createDeploymentLogger } from '@shepai/core/infrastructure/services/deployment/deployment-logger';
import { computeWorktreePath } from '@shepai/core/infrastructure/services/ide-launchers/compute-worktree-path';
import type { IFeatureRepository } from '@shepai/core/application/ports/output/repositories/feature-repository.interface';
import type { IDeploymentService } from '@shepai/core/application/ports/output/services/deployment-service.interface';
import type { IRepoCacheKeyResolver } from '@shepai/core/application/ports/output/services/repo-cache-key-resolver.interface';
import type { IDevEnvAnalysisRepository } from '@shepai/core/application/ports/output/repositories/dev-env-analysis-repository.interface';
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

    const deploymentService = resolve<IDeploymentService>('IDeploymentService');

    // Try to use cached analysis for startWithAnalysis
    try {
      const cacheKeyResolver = resolve<IRepoCacheKeyResolver>('IRepoCacheKeyResolver');
      const cacheKey = await cacheKeyResolver.resolve(worktreePath);
      const analysisRepo = resolve<IDevEnvAnalysisRepository>('IDevEnvAnalysisRepository');
      const cached = await analysisRepo.findByCacheKey(cacheKey);

      if (cached) {
        if (!cached.canStart) {
          log.info(`cached analysis says not startable: ${cached.reason}`);
          return { success: true, state: DeploymentState.NotStartable };
        }
        log.info('using cached analysis for deployment');
        deploymentService.startWithAnalysis(featureId, worktreePath, cached);
        log.info('startWithAnalysis() returned successfully — state=Booting');
        return { success: true, state: DeploymentState.Booting };
      }
    } catch (cacheError) {
      log.warn('cache lookup failed, falling back to direct start', cacheError);
    }

    // Fallback: no cached analysis, use existing direct start
    log.info('no cached analysis, calling deploymentService.start()');
    deploymentService.start(featureId, worktreePath);

    log.info('start() returned successfully — state=Booting');
    return { success: true, state: DeploymentState.Booting };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to deploy feature';
    log.error(`error: ${message}`, error);
    return { success: false, error: message };
  }
}
